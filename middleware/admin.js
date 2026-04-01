module.exports = (req, res, next) => {
    if (req.isAuthenticated() && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
        return next();
    }
    res.status(403).send('Доступ запрещен. Требуются права администратора.');
};