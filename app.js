require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const { sequelize } = require('./models');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Middleware с увеличенным лимитом для фото
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
});

app.use(sessionMiddleware);

// Passport setup
require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// Socket.io with session
const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/posts', require('./routes/posts'));
app.use('/profile', require('./routes/profile'));
app.use('/admin', require('./routes/admin'));
app.use('/appeals', require('./routes/appeals'));

// ============ API ДЛЯ ЛИЧНЫХ СООБЩЕНИЙ ============

// API для получения всех пользователей
app.get('/api/users', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const users = await require('./models').User.findAll({
        attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role']
    });
    res.json(users);
});

// API для получения личных сообщений
app.get('/api/messages/private/:userId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { Message, User } = require('./models');
    const { Op } = require('sequelize');
    const messages = await Message.findAll({
        where: {
            [Op.or]: [
                { userId: req.user.id, recipientId: req.params.userId },
                { userId: req.params.userId, recipientId: req.user.id }
            ]
        },
        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix'] }],
        order: [['createdAt', 'ASC']],
        limit: 100
    });
    res.json(messages);
});

// API для получения диалогов пользователя
app.get('/api/user-conversations', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { Message, User } = require('./models');
    const { Op } = require('sequelize');
    
    const messages = await Message.findAll({
        where: {
            room: 'private',
            [Op.or]: [
                { userId: req.user.id },
                { recipientId: req.user.id }
            ]
        },
        attributes: ['userId', 'recipientId', 'content', 'createdAt'],
        order: [['createdAt', 'DESC']]
    });
    
    const conversations = new Map();
    
    for (const msg of messages) {
        const partnerId = msg.userId == req.user.id ? msg.recipientId : msg.userId;
        if (!conversations.has(partnerId) && partnerId) {
            const partner = await User.findByPk(partnerId, {
                attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix']
            });
            if (partner) {
                conversations.set(partnerId, {
                    user: partner,
                    lastMessage: msg.content,
                    lastMessageTime: msg.createdAt
                });
            }
        }
    }
    
    res.json(Array.from(conversations.values()));
});

// API для получения сообщений с конкретным пользователем
app.get('/api/messages/with/:userId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { Message, User } = require('./models');
    const { Op } = require('sequelize');
    
    const messages = await Message.findAll({
        where: {
            room: 'private',
            [Op.or]: [
                { userId: req.user.id, recipientId: req.params.userId },
                { userId: req.params.userId, recipientId: req.user.id }
            ]
        },
        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix'] }],
        order: [['createdAt', 'ASC']]
    });
    
    res.json(messages);
});

// ============ ОСНОВНЫЕ СТРАНИЦЫ ============

// Main page
app.get('/', async (req, res) => {
    const { Post, User } = require('./models');
    
    // Сначала получаем закрепленные посты
    const pinnedPosts = await Post.findAll({
        where: { isPinned: true },
        include: [{ model: User, attributes: ['id', 'username', 'avatar', 'role', 'callsign', 'unitPrefix'] }],
        order: [['createdAt', 'DESC']]
    });
    
    // Затем обычные посты (не закрепленные)
    const normalPosts = await Post.findAll({
        where: { isPinned: false },
        include: [{ model: User, attributes: ['id', 'username', 'avatar', 'role', 'callsign', 'unitPrefix'] }],
        order: [['createdAt', 'DESC']],
        limit: 50
    });
    
    // Объединяем: сначала закрепленные, потом обычные
    const posts = [...pinnedPosts, ...normalPosts];
    
    res.render('index', { user: req.user, posts });
});

// Chat page
app.get('/chat', (req, res) => {
    if (!req.user) return res.redirect('/auth/discord');
    const privateWith = req.query.private || null;
    res.render('chat', { user: req.user, privateWith: privateWith });
});

// Чат СРО "Туман" - для админов
app.get('/chat-tuman', (req, res) => {
    if (!req.user) return res.redirect('/auth/discord');
    const allowedRoles = ['admin', 'superadmin'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).send('Доступ запрещен. Только для администрации');
    }
    res.render('chat-tuman', { user: req.user });
});

// Socket.io
require('./sockets/chat')(io);

// Database sync and server start
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: false }).then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Unable to connect to database:', err);
});