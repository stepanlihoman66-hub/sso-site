const { Message, User } = require('../models');
const { Op } = require('sequelize');

const sockets = {};
const tumanSockets = {};

module.exports = (io) => {
    // Общий чат
    io.of('/').on('connection', async (socket) => {
        console.log('✅ Общий чат: новое подключение');
        
        try {
            const session = socket.request.session;
            if (!session || !session.passport || !session.passport.user) {
                console.log('❌ Общий чат: нет сессии');
                socket.disconnect();
                return;
            }
            
            const userId = session.passport.user;
            const user = await User.findByPk(userId);
            
            if (!user) {
                console.log('❌ Общий чат: пользователь не найден');
                socket.disconnect();
                return;
            }
            
            console.log(`✅ Пользователь ${user.callsign} (ID: ${userId}) подключился к общему чату`);
            socket.userId = userId;
            socket.user = user;
            sockets[userId] = socket;
            
            socket.join('main');
            
            // Загрузка общих сообщений
            try {
                const recentMessages = await Message.findAll({
                    where: { room: 'main', recipientId: null },
                    include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }],
                    order: [['createdAt', 'DESC']],
                    limit: 50
                });
                socket.emit('load messages', recentMessages.reverse());
                console.log(`📨 Загружено ${recentMessages.length} общих сообщений`);
            } catch (err) {
                console.error('Ошибка загрузки сообщений:', err);
            }
            
            // ============ ОТПРАВКА СООБЩЕНИЙ ============
            socket.on('send message', async (data) => {
                console.log(`📝 Сообщение от ${user.callsign}:`, data);
                
                try {
                    const isPrivate = data.recipientId && data.recipientId !== null && data.recipientId !== undefined && data.recipientId !== '';
                    
                    const message = await Message.create({
                        content: data.message,
                        imageUrl: null,
                        fileUrl: null,
                        fileName: null,
                        userId: userId,
                        room: isPrivate ? 'private' : 'main',
                        recipientId: data.recipientId || null,
                        replyToId: data.replyToId || null,
                        mentions: data.mentions || null
                    });
                    
                    console.log(`💾 Сообщение сохранено в БД, ID: ${message.id}`);
                    
                    const messageWithUser = await Message.findByPk(message.id, {
                        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }]
                    });
                    
                    if (isPrivate) {
                        console.log(`🔒 Личное сообщение от ${user.callsign} к пользователю ${data.recipientId}`);
                        
                        const recipientSocket = sockets[data.recipientId];
                        if (recipientSocket) {
                            recipientSocket.emit('private message', messageWithUser);
                            console.log(`📨 Сообщение отправлено получателю (онлайн)`);
                        } else {
                            console.log(`⚠️ Получатель не в сети, сообщение сохранено в БД`);
                        }
                        
                        socket.emit('private message', messageWithUser);
                        
                    } else {
                        console.log(`🌍 Общее сообщение от ${user.callsign}`);
                        io.of('/').to('main').emit('new message', messageWithUser);
                    }
                    
                } catch (err) {
                    console.error('❌ Ошибка при отправке сообщения:', err);
                }
            });
            
            // ОТПРАВКА ФОТО
            socket.on('send image', async (data) => {
                try {
                    const isPrivate = data.recipientId && data.recipientId !== null && data.recipientId !== undefined;
                    
                    const message = await Message.create({
                        content: data.message || '',
                        imageUrl: data.imageUrl,
                        fileUrl: null,
                        fileName: null,
                        userId: userId,
                        room: isPrivate ? 'private' : 'main',
                        recipientId: data.recipientId || null,
                        replyToId: data.replyToId || null,
                        mentions: data.mentions || null
                    });
                    
                    const messageWithUser = await Message.findByPk(message.id, {
                        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }]
                    });
                    
                    if (isPrivate) {
                        const recipientSocket = sockets[data.recipientId];
                        if (recipientSocket) recipientSocket.emit('private message', messageWithUser);
                        socket.emit('private message', messageWithUser);
                    } else {
                        io.of('/').to('main').emit('new message', messageWithUser);
                    }
                } catch (err) {
                    console.error(err);
                }
            });
            
            // ОТПРАВКА ФАЙЛА
            socket.on('send file', async (data) => {
                try {
                    const isPrivate = data.recipientId && data.recipientId !== null && data.recipientId !== undefined;
                    
                    const message = await Message.create({
                        content: data.message || '',
                        imageUrl: null,
                        fileUrl: data.fileUrl,
                        fileName: data.fileName,
                        userId: userId,
                        room: isPrivate ? 'private' : 'main',
                        recipientId: data.recipientId || null,
                        replyToId: data.replyToId || null,
                        mentions: data.mentions || null
                    });
                    
                    const messageWithUser = await Message.findByPk(message.id, {
                        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }]
                    });
                    
                    if (isPrivate) {
                        const recipientSocket = sockets[data.recipientId];
                        if (recipientSocket) recipientSocket.emit('private message', messageWithUser);
                        socket.emit('private message', messageWithUser);
                    } else {
                        io.of('/').to('main').emit('new message', messageWithUser);
                    }
                } catch (err) {
                    console.error(err);
                }
            });
            
            // УДАЛЕНИЕ СООБЩЕНИЯ
            socket.on('delete message', async (data) => {
                const message = await Message.findByPk(data.messageId);
                if (!message) return;
                const isAuthor = message.userId === userId;
                const isAdminUser = user && (user.role === 'admin' || user.role === 'superadmin');
                if (isAuthor || isAdminUser) {
                    await message.destroy();
                    io.of('/').emit('message deleted', { messageId: data.messageId });
                }
            });
            
            // ЗАГРУЗКА ЛИЧНЫХ СООБЩЕНИЙ
            socket.on('load private messages', async (data) => {
                const { withUserId } = data;
                console.log(`📜 Загрузка истории переписки между ${user.callsign} и ${withUserId}`);
                
                try {
                    const privateMessages = await Message.findAll({
                        where: {
                            room: 'private',
                            [Op.or]: [
                                { userId: userId, recipientId: withUserId },
                                { userId: withUserId, recipientId: userId }
                            ]
                        },
                        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }],
                        order: [['createdAt', 'ASC']],
                        limit: 100
                    });
                    
                    console.log(`📨 Загружено ${privateMessages.length} личных сообщений`);
                    socket.emit('private messages loaded', { with: withUserId, messages: privateMessages });
                } catch (err) {
                    console.error('Ошибка загрузки личных сообщений:', err);
                    socket.emit('private messages loaded', { with: withUserId, messages: [] });
                }
            });
            
            socket.on('disconnect', () => {
                delete sockets[userId];
                console.log(`❌ Пользователь ${user?.callsign} отключился от общего чата`);
            });
            
        } catch (err) {
            console.error('Ошибка в общем чате:', err);
        }
    });
    
    // Чат СРО "Туман"
    io.of('/tuman').on('connection', async (socket) => {
        console.log('✅ Чат Туман: новое подключение');
        
        try {
            const session = socket.request.session;
            if (!session || !session.passport || !session.passport.user) {
                console.log('❌ Чат Туман: нет сессии');
                socket.disconnect();
                return;
            }
            
            const userId = session.passport.user;
            const user = await User.findByPk(userId);
            
            if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
                console.log(`❌ Чат Туман: доступ запрещен для ${user?.callsign}`);
                socket.disconnect();
                return;
            }
            
            console.log(`✅ Чат Туман: пользователь ${user.callsign} подключился`);
            tumanSockets[userId] = socket;
            socket.join('tuman');
            
            const recentMessages = await Message.findAll({
                where: { room: 'tuman' },
                include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }],
                order: [['createdAt', 'DESC']],
                limit: 50
            });
            socket.emit('load messages', recentMessages.reverse());
            
            socket.on('send message', async (data) => {
                try {
                    const message = await Message.create({
                        content: data.message,
                        imageUrl: null,
                        fileUrl: null,
                        fileName: null,
                        userId: userId,
                        room: 'tuman',
                        replyToId: data.replyToId || null,
                        mentions: data.mentions || null
                    });
                    const messageWithUser = await Message.findByPk(message.id, {
                        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }]
                    });
                    io.of('/tuman').to('tuman').emit('new message', messageWithUser);
                } catch (err) { console.error(err); }
            });
            
            socket.on('send image', async (data) => {
                try {
                    const message = await Message.create({
                        content: data.message || '',
                        imageUrl: data.imageUrl,
                        fileUrl: null,
                        fileName: null,
                        userId: userId,
                        room: 'tuman',
                        replyToId: data.replyToId || null,
                        mentions: data.mentions || null
                    });
                    const messageWithUser = await Message.findByPk(message.id, {
                        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }]
                    });
                    io.of('/tuman').to('tuman').emit('new message', messageWithUser);
                } catch (err) { console.error(err); }
            });
            
            socket.on('send file', async (data) => {
                try {
                    const message = await Message.create({
                        content: data.message || '',
                        imageUrl: null,
                        fileUrl: data.fileUrl,
                        fileName: data.fileName,
                        userId: userId,
                        room: 'tuman',
                        replyToId: data.replyToId || null,
                        mentions: data.mentions || null
                    });
                    const messageWithUser = await Message.findByPk(message.id, {
                        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'avatar', 'unitPrefix', 'role'] }]
                    });
                    io.of('/tuman').to('tuman').emit('new message', messageWithUser);
                } catch (err) { console.error(err); }
            });
            
            socket.on('delete message', async (data) => {
                const message = await Message.findByPk(data.messageId);
                if (!message) return;
                const isAuthor = message.userId === userId;
                const isAdminUser = user && (user.role === 'admin' || user.role === 'superadmin');
                if (isAuthor || isAdminUser) {
                    await message.destroy();
                    io.of('/tuman').emit('message deleted', { messageId: data.messageId });
                }
            });
            
            socket.on('disconnect', () => {
                delete tumanSockets[userId];
                console.log(`❌ Пользователь ${user?.callsign} отключился от чата Туман`);
            });
            
        } catch (err) {
            console.error('Ошибка чата Туман:', err);
        }
    });
};