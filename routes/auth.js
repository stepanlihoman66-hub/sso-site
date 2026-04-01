const express = require('express');
const router = express.Router();
const passport = require('passport');
const { User } = require('../models');

// Вход через Discord
router.get('/discord', passport.authenticate('discord'));

// Обработка callback от Discord
router.get('/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/' }),
    (req, res) => {
        // После успешного входа перенаправляем на верификацию
        res.redirect('/auth/verify');
    }
);

// Страница верификации
router.get('/verify', (req, res) => {
    if (!req.user) return res.redirect('/auth/discord');
    if (req.user.verified) return res.redirect('/');
    res.render('verify', { user: req.user });
});

// Обработка верификации
router.post('/verify', async (req, res) => {
    const { personalFileUrl } = req.body;
    
    if (!personalFileUrl) {
        return res.redirect('/auth/verify');
    }
    
    try {
        await User.update(
            { personalFileUrl, verified: true },
            { where: { id: req.user.id } }
        );
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/auth/verify');
    }
});

// Выход
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

module.exports = router;