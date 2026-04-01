const express = require('express');
const router = express.Router();
const { Post } = require('../models');
const { ensureAuthenticated, checkBanned } = require('../middleware/auth');

router.post('/create', ensureAuthenticated, checkBanned, async (req, res) => {
    try {
        const { content, imageUrl, sticker, isModeratorPost } = req.body;
        
        // Проверяем, может ли пользователь публиковать как модератор
        const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
        const shouldPin = isAdmin && isModeratorPost === 'true';
        
        const newPost = await Post.create({
            content: content || '',
            imageUrl: imageUrl || null,
            sticker: sticker || null,
            isPinned: shouldPin,
            isModeratorPost: shouldPin,
            userId: req.user.id
        });
        
        console.log('Пост создан, ID:', newPost.id, shouldPin ? '(ЗАКРЕПЛЕН)' : '');
        res.redirect('/');
    } catch (err) {
        console.error('Ошибка при создании поста:', err);
        res.redirect('/');
    }
});

router.delete('/:id', ensureAuthenticated, async (req, res) => {
    const post = await Post.findByPk(req.params.id);
    
    if (!post) {
        return res.status(404).json({ error: 'Пост не найден' });
    }
    
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || post.userId === req.user.id) {
        await post.destroy();
        return res.json({ success: true });
    }
    
    res.status(403).json({ error: 'Нет прав для удаления' });
});

module.exports = router;