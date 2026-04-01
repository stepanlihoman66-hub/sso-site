const express = require('express');
const router = express.Router();
const { User, Post } = require('../models');
const { ensureAuthenticated } = require('../middleware/auth');

// ВАЖНО: маршрут /edit должен быть ПЕРЕД маршрутом /:id
// Иначе "edit" будет восприниматься как ID пользователя

// Страница редактирования профиля
router.get('/edit', ensureAuthenticated, (req, res) => {
    res.render('edit-profile', { user: req.user });
});

// Обработка редактирования профиля
router.post('/edit', ensureAuthenticated, async (req, res) => {
    const { callsign, personalFileUrl, avatar } = req.body;
    
    try {
        await req.user.update({
            callsign: callsign || req.user.callsign,
            personalFileUrl: personalFileUrl || req.user.personalFileUrl,
            avatar: avatar || req.user.avatar
        });
        res.redirect(`/profile/${req.user.id}`);
    } catch (err) {
        console.error(err);
        res.redirect('/profile/edit');
    }
});

// Страница просмотра профиля (должна быть ПОСЛЕ /edit)
router.get('/:id', async (req, res) => {
    const user = await User.findByPk(req.params.id, {
        attributes: ['id', 'username', 'callsign', 'avatar', 'personalFileUrl', 'unitPrefix', 'role']
    });
    
    if (!user) {
        return res.status(404).send('Пользователь не найден');
    }
    
    const posts = await Post.findAll({
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
        limit: 20
    });
    
    res.render('profile', { profileUser: user, posts, currentUser: req.user });
});

module.exports = router;