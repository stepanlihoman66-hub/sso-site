const express = require('express');
const router = express.Router();
const { User, Post, Appeal, Message } = require('../models');
const adminMiddleware = require('../middleware/admin');

router.use(adminMiddleware);

// ============ ОСНОВНАЯ АДМИН-ПАНЕЛЬ ============
router.get('/', async (req, res) => {
    const users = await User.findAll({
        attributes: ['id', 'username', 'callsign', 'unitPrefix', 'role', 'isBanned', 'verified']
    });
    const posts = await Post.findAll({
        include: [{ model: User, attributes: ['username'] }],
        order: [['createdAt', 'DESC']]
    });
    
    res.render('admin', { users, posts, admin: req.user });
});

// Бан/разбан пользователя
router.post('/user/:id/ban', async (req, res) => {
    const user = await User.findByPk(req.params.id);
    if (user && user.role !== 'superadmin') {
        await user.update({ isBanned: !user.isBanned });
    }
    res.redirect('/admin');
});

// Удаление пользователя (только для superadmin)
router.post('/user/:id/delete', async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).send('Только главный администратор может удалять пользователей');
    }
    
    const userToDelete = await User.findByPk(req.params.id);
    
    if (!userToDelete) {
        return res.status(404).send('Пользователь не найден');
    }
    
    if (userToDelete.id === req.user.id) {
        return res.status(403).send('Нельзя удалить самого себя');
    }
    
    if (userToDelete.role === 'superadmin') {
        return res.status(403).send('Нельзя удалить главного администратора');
    }
    
    try {
        await Post.destroy({ where: { userId: userToDelete.id } });
        await Message.destroy({ where: { userId: userToDelete.id } });
        await Appeal.destroy({ where: { userId: userToDelete.id } });
        await userToDelete.destroy();
        res.redirect('/admin');
    } catch (err) {
        console.error('Ошибка при удалении пользователя:', err);
        res.status(500).send('Ошибка при удалении пользователя');
    }
});

// Обновление глобального префикса
router.post('/update-prefix', async (req, res) => {
    const { prefix } = req.body;
    await User.update({ unitPrefix: prefix }, { where: {} });
    res.json({ success: true });
});

// Обновление префикса пользователя
router.post('/user/:id/prefix', async (req, res) => {
    const { prefix } = req.body;
    const user = await User.findByPk(req.params.id);
    if (user) {
        await user.update({ unitPrefix: prefix });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Обновление роли пользователя (только для superadmin)
router.post('/user/:id/role', async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Только главный админ может менять роли' });
    }
    
    const { role } = req.body;
    const user = await User.findByPk(req.params.id);
    if (user) {
        await user.update({ role });
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Пользователь не найден' });
    }
});

// Удаление поста
router.delete('/post/:id', async (req, res) => {
    await Post.destroy({ where: { id: req.params.id } });
    res.json({ success: true });
});

// Обращения
router.get('/appeals', async (req, res) => {
    const appeals = await Appeal.findAll({
        include: [{ model: User, attributes: ['id', 'username', 'callsign', 'unitPrefix', 'avatar'] }],
        order: [['createdAt', 'DESC']]
    });
    res.render('appeals', { appeals, admin: req.user });
});

// ============ АДМИН-КОНСОЛЬ (только для superadmin) ============

// Страница админ-консоли
router.get('/console', (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).send('Доступ запрещен. Только для главного администратора.');
    }
    res.render('admin-console', { admin: req.user });
});

// Проверка пароля для входа в консоль
router.post('/console/check-password', (req, res) => {
    const { password } = req.body;
    if (password === '1289') {
        res.json({ success: true });
    } else {
        res.json({ success: false, error: 'Неверный пароль' });
    }
});

// Хранилище логов терминала
let terminalLogs = ['[СИСТЕМА] Админ-консоль готова к работе\n'];

// Получение логов терминала
router.get('/console/logs', (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    res.json({ logs: terminalLogs });
});

// Очистка логов
router.post('/console/clear-logs', (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    terminalLogs = ['[СИСТЕМА] Логи очищены\n'];
    res.json({ success: true });
});

// Выполнение команды в консоли
router.post('/console/command', async (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const { command } = req.body;
    const timestamp = new Date().toLocaleTimeString();
    
    terminalLogs.push(`[${timestamp}] > ${command}\n`);
    
    try {
        const { exec } = require('child_process');
        exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
            if (error) {
                terminalLogs.push(`[${timestamp}] ❌ Ошибка: ${error.message}\n`);
                res.json({ output: `❌ Ошибка: ${error.message}` });
            } else if (stderr) {
                terminalLogs.push(`[${timestamp}] ⚠️ ${stderr}\n`);
                res.json({ output: stderr });
            } else {
                terminalLogs.push(`[${timestamp}] ✅ ${stdout || 'Команда выполнена'}\n`);
                res.json({ output: stdout || '✅ Команда выполнена' });
            }
        });
    } catch (err) {
        terminalLogs.push(`[${timestamp}] ❌ Ошибка: ${err.message}\n`);
        res.json({ output: `❌ Ошибка: ${err.message}` });
    }
});

// Выключение сайта
router.post('/console/shutdown', (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const timestamp = new Date().toLocaleTimeString();
    terminalLogs.push(`[${timestamp}] 🔴 Сайт выключается...\n`);
    
    res.json({ success: true, message: 'Сайт выключается...' });
    
    // Завершаем процесс через 1 секунду
    setTimeout(() => {
        process.exit(0);
    }, 1000);
});

// Перезагрузка сайта
router.post('/console/restart', (req, res) => {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Доступ запрещен' });
    }
    
    const timestamp = new Date().toLocaleTimeString();
    terminalLogs.push(`[${timestamp}] 🔄 Сайт перезагружается...\n`);
    
    res.json({ success: true, message: 'Сайт перезагружается...' });
    
    // Перезапускаем процесс
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

module.exports = router;