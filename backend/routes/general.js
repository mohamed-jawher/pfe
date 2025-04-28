const express = require('express');
const router = express.Router();

// Route principale (using Handlebars)
router.get('/', (req, res) => {
    res.render('index', { 
        title: 'TN M3allim - Accueil',
        user: req.session && req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});

// Route for "How it works" page
router.get('/comment_utiliser', (req, res) => {
    res.render('comment_utiliser/index', { 
        title: 'كيف يعمل؟ - TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});

// Route for services page
router.get('/services', (req, res) => {
    res.render('services/index', { 
        title: 'خدماتنا - TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});

// Route for artisan list
router.get('/listartisan', (req, res) => {
    res.render('artisan-list/index', {
        title: 'قائمة الحرفيين - TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});

router.get('/lireplus', (req, res) => {
    res.render('lireplus/index', { 
        title: 'مهمتنا - TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});

router.get('/viewport', (req, res) => {
    res.render('viewport/index', { 
        title: 'تبحث عن حرفي؟ - TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});
// Add privacy policy route
router.get('/confidentialite', (req, res) => {
    res.render('confidentialite/index', {
        title: 'الشروط والأحكام - TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});
// Add privacy policy route
router.get('/conditions', (req, res) => {
    res.render('conditions/index', {
        title: 'سياسة الخصوصية - TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});
module.exports = router;