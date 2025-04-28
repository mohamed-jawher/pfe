const express = require('express');
const path = require('path');
const hbs = require('hbs');
const session = require('express-session');
const db = require('./config/database');
const app = express();

// Import middleware
const { setupMiddleware } = require('./middleware/setup');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const artisanRoutes = require('./routes/artisan');
const clientRoutes = require('./routes/client');
const profileRoutes = require('./routes/profile');
const contactRoutes = require('./routes/contact');
const generalRoutes = require('./routes/general');

// Database connection
db.connect((err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.stack);
        return;
    }
    console.log('Connecté à la base de données MySQL');
});

// Setup middleware
setupMiddleware(app);

// Setup view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, '..', 'public', 'views'));
hbs.registerPartials(path.join(__dirname, '..', 'public', 'views', 'partials'));

// Register Handlebars helpers
hbs.registerHelper('json', function (context) {
    return JSON.stringify(context);
});

hbs.registerHelper('eq', function (a, b) {
    return a === b;
});

hbs.registerHelper('formatDate', function (date) {
    if (!date) return '';
    
    const now = new Date();
    const dateObj = new Date(date);
    const diffMs = now - dateObj;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 30) {
        return dateObj.toLocaleDateString('ar-TN');
    } else if (diffDay > 0) {
        return `منذ ${diffDay} ${diffDay === 1 ? 'يوم' : 'أيام'}`;
    } else if (diffHour > 0) {
        return `منذ ${diffHour} ${diffHour === 1 ? 'ساعة' : 'ساعات'}`;
    } else if (diffMin > 0) {
        return `منذ ${diffMin} ${diffMin === 1 ? 'دقيقة' : 'دقائق'}`;
    } else {
        return 'منذ لحظات';
    }
});

// Middleware to make user data available to all views
app.use((req, res, next) => {
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        role: req.session.userRole,
        name: req.session.userName
    } : null;
    next();
});
// Add this near the top of your app configuration
app.use('/public', express.static(path.join(__dirname, 'public')));
// Register routes
app.use('/', generalRoutes);
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/artisan', artisanRoutes);
app.use('/client', clientRoutes);
app.use('/profile', profileRoutes);
app.use('/contact-us', contactRoutes);
app.use('/auth', authRoutes);
// Make artisan routes accessible from root path as well
app.use('/', artisanRoutes);
// Make profile routes accessible from root path as well
app.use('/', profileRoutes);
app.use('/', adminRoutes);
// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Remove the duplicate export and server start
// module.exports = app;

// Server configuration and start
const port = process.env.PORT || 3001;

const startServer = async () => {
    try {
        const server = app.listen(port, () => {
            console.log(`Server started on http://localhost:${port}`);
        });

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${port} is already in use`);
                process.exit(1);
            } else {
                console.error('Server error:', err);
                process.exit(1);
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Only start the server if this file is run directly
if (require.main === module) {
    startServer();
}

module.exports = app;