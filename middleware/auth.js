module.exports = {
    ensureAuthenticated: (req, res, next) => {
        if (req.isAuthenticated()) {
            if (req.user.isBanned) {
                return res.status(403).send('Вы забанены на сайте. Обратитесь к командиру.');
            }
            return next();
        }
        res.redirect('/auth/discord');
    },
    
    ensureVerified: async (req, res, next) => {
        if (req.user && !req.user.verified && req.path !== '/verify') {
            return res.redirect('/verify');
        }
        next();
    },
    
    checkBanned: (req, res, next) => {
        if (req.user && req.user.isBanned) {
            return res.status(403).send('Вы забанены и не можете выполнять это действие.');
        }
        next();
    }
};