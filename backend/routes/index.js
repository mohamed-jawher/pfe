// Add report problem route
router.get('/report-problem', checkAuth, (req, res) => {
    res.render('report-problem/index', {
        title: 'الإبلاغ عن مشكلة - TN M3allim',
        user: {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        }
    });
});

// Handle report submission
router.post('/report-problem', checkAuth, (req, res) => {
    // Save the report to database
    const report = {
        userId: req.session.userId,
        answers: req.body,
        comments: req.body.comments,
        createdAt: new Date()
    };
    
    // Add to database and respond
    res.json({ success: true, message: 'تم إرسال التقرير بنجاح' });
});