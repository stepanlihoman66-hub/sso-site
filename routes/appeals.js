const express = require('express');
const router = express.Router();
const { Appeal, User } = require('../models');
const { ensureAuthenticated, checkBanned } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// Страница создания обращения (GET)
router.get('/create', ensureAuthenticated, (req, res) => {
    if (req.user.isBanned) {
        return res.status(403).send('Вы забанены и не можете отправлять обращения.');
    }
    res.render('appeals-create', { user: req.user });
});

// Отправка обращения (POST)
router.post('/create', ensureAuthenticated, checkBanned, async (req, res) => {
    try {
        await Appeal.create({
            content: req.body.content,
            userId: req.user.id,
            status: 'new'
        });
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

// Просмотр обращений (только для админа)
router.get('/', adminMiddleware, async (req, res) => {
    const appeals = await Appeal.findAll({
        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'unitPrefix', 'avatar'] }],
        order: [['createdAt', 'DESC']]
    });
    
    res.render('appeals', { appeals, admin: req.user });
});

// Отметить как прочитанное
router.post('/:id/read', adminMiddleware, async (req, res) => {
    const appeal = await Appeal.findByPk(req.params.id);
    if (appeal) {
        await appeal.update({ status: 'read' });
    }
    res.redirect('/appeals');
});

module.exports = router;