const checkAuth = (req, res, next) => {
   

    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
};

const checkArtisanAuth = (req, res, next) => {
    if (!req.session.userId || req.session.userRole !== 'artisan') {
        return req.session.destroy(() => {
            res.redirect('/login');
        });
    }
    next();
};

const checkClientAuth = (req, res, next) => {
    if (!req.session.userId || req.session.userRole !== 'client') {
        return req.session.destroy(() => {
            res.redirect('/login');
        });
    }
    next();
};

const checkAdminAuth = (req, res, next) => {
    if (!req.session.userId || req.session.userRole !== 'admin') {
        return req.session.destroy(() => {
            res.redirect('/admin/login');
        });
    }
    next();
};

module.exports = {
    checkAuth,
    checkArtisanAuth,
    checkClientAuth,
    checkAdminAuth
};