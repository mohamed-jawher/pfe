const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');

// Middleware to check if user is admin
const checkAdminAuth = (req, res, next) => {
    if (!req.session.userId || req.session.userRole !== 'admin') {
        // Clear any existing session
        req.session.destroy(() => {
            res.redirect('/admin/login');
        });
        return;
    }
    next();
};

// Admin login page
router.get('/login', (req, res) => {
    if (req.session.userRole === 'admin') {
        return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { layout: false });
});

// Admin login handler
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
            });
        }

        const query = 'SELECT * FROM utilisateurs WHERE email = ? AND rôle = "admin" LIMIT 1';
        
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    error: 'حدث خطأ في النظام'
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    success: false,
                    error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
                });
            }

            const admin = results[0];
            const passwordMatch = await bcrypt.compare(password, admin.mot_de_passe);

            if (!passwordMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
                });
            }

            // Set session data
            req.session.userId = admin.id;
            req.session.userRole = admin.rôle;
            req.session.userName = admin.nom;

            res.json({
                success: true,
                message: 'تم تسجيل الدخول بنجاح'
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'حدث خطأ في النظام'
        });
    }
});
// Client list page - render view
router.get('/client-list', checkAdminAuth, (req, res) => {
const statsQuery = `
        SELECT
            COUNT(DISTINCT u.id) as totalClients,
        FROM utilisateurs u
        WHERE u.rôle = 'client'
    `;
    db.query(statsQuery, (err, stats) => {
        if (err) {
            console.error('Error fetching stats:', err);
            return res.render('client-list/index', {
                title: 'قائمة المستخدمين',
                user: {
                    id: req.session.userId,
                    role: req.session.userRole,
                    name: req.session.userName
                },
                totalClients: 0,
                role:'client'
            });

        }
        res.render('client-list/index', {
            title: 'قائمة المستخدمين',
            user: {
                id: req.session.userId,
                role: req.session.userRole,
                name: req.session.userName
            },
            totalClients: stats[0].totalClients,
                role: 'client'
        });
    })

});



// View single client
router.get('/client/:id', checkAdminAuth, (req, res) => {
    const query = 'SELECT * FROM utilisateurs WHERE id = ? AND rôle = "client"';
    
    db.query(query, [req.params.id], (err, results) => {
        if (err || results.length === 0) {
            return res.redirect('/admin/client-list');
        }
        
        res.render('admin/client-view', {
            title: 'تفاصيل المستخدم',
            client: results[0],
            user: {
                id: req.session.userId,
                role: req.session.userRole,
                name: req.session.userName
            }
        });
    });
});

// Delete client
router.post('/client/:id/delete', checkAdminAuth, (req, res) => {
    const query = 'DELETE FROM utilisateurs WHERE id = ? AND rôle = "client"';
    
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error deleting client:', err);
            return res.status(500).json({ 
                success: false, 
                error: 'Error deleting client' 
            });
        }
        
        res.json({ success: true });
    });
});
// Admin logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

// Admin dashboard (protected route)
router.get('/dashboard', checkAdminAuth, (req, res) => {
    res.render('dashbord/index', {
        title: 'لوحة التحكم',
        user: {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        }
    });
});

// Get users data for DataTables
router.get('/users-data', checkAdminAuth, (req, res) => {
    const role = req.query.role;
    console.log('Requested role:', role); // Debug log

    if (role === 'artisan') {
        const query = `
            SELECT 
                u.id, 
                u.nom, 
                u.email, 
                u.gouvernorat,
                u.telephone,
                COALESCE(AVG(r.rating), 0) as rating
            FROM utilisateurs u
            LEFT JOIN reviews r ON u.id = r.artisan_id
            WHERE u.rôle = 'artisan'
            GROUP BY u.id, u.nom, u.email, u.gouvernorat, u.telephone
            ORDER BY u.id DESC
        `;

        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching artisans:', err);
                return res.status(500).json({ error: 'Error fetching artisans' });
            }
            
            res.json(results);
        });
    } else if (role === 'client') {
        const query = `
            SELECT id, nom, email, telephone, gouvernorat
            FROM utilisateurs
            WHERE rôle = 'client'
            ORDER BY id DESC
        `;
        db.query(query, (err, results) => {
            if (err) {
                console.error('Error fetching clients:', err);
                return res.status(500).json({ error: 'Error fetching clients' });
            }       
            console.log('Clients results:', results); // Debug log
            res.json(results);      

        })
    }
    
    
    else {
        const query = `
            SELECT id, nom, email, telephone, gouvernorat
            FROM utilisateurs 
            WHERE rôle = 'client'
            ORDER BY id DESC
        `;

        db.query(query, [role], (err, results) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).json({ error: 'Error fetching users' });
            }
            console.log('Users results:', results); // Debug log
            res.json(results);
        });
    }
});

// Update artisan list route to include statistics
router.get('/artisan-list', checkAdminAuth, (req, res) => {
    const statsQuery = `
        SELECT 
            COUNT(DISTINCT u.id) as totalArtisans,
            COUNT(DISTINCT u.id) as activeArtisans,
            COALESCE(AVG(r.rating), 0) as avgRating
        FROM utilisateurs u
        LEFT JOIN reviews r ON u.id = r.artisan_id
        WHERE u.rôle = 'artisan'
    `;

    db.query(statsQuery, (err, stats) => {
        if (err) {
            console.error('Error fetching stats:', err);
            return res.render('artisan-list/index', {
                title: 'قائمة الحرفيين',
                user: {
                    id: req.session.userId,
                    role: req.session.userRole,
                    name: req.session.userName
                },
                totalArtisans: 0,
                activeArtisans: 0,
                avgRating: 0
            });
        }

        res.render('artisan-list/index', {
            title: 'قائمة الحرفيين',
            user: {
                id: req.session.userId,
                role: req.session.userRole,
                name: req.session.userName
            },
            totalArtisans: stats[0].totalArtisans,
            activeArtisans: stats[0].activeArtisans,
            avgRating: parseFloat(stats[0].avgRating || 0).toFixed(1)
        });
    });
});

// Settings page
router.get('/settings', checkAdminAuth, (req, res) => {
    const query = 'SELECT nom, email FROM utilisateurs WHERE id = ? AND rôle = "admin"';
    
    db.query(query, [req.session.userId], (err, results) => {
        if (err) {
            console.error('Error fetching admin data:', err);
            return res.render('settings/index', {
                title: 'الإعدادات - TN M3allim',
                user: {
                    id: req.session.userId,
                    role: req.session.userRole,
                    name: req.session.userName,
                    email: ''
                }
            });
        }

        res.render('settings/index', {
            title: 'الإعدادات - TN M3allim',
            user: {
                id: req.session.userId,
                role: req.session.userRole,
                name: results[0].nom,
                email: results[0].email
            }
        });
    });
});

// Update profile
router.post('/settings/update-profile', checkAdminAuth, (req, res) => {
    const { name, email } = req.body;
    const query = 'UPDATE utilisateurs SET nom = ?, email = ? WHERE id = ? AND rôle = "admin"';
    
    db.query(query, [name, email, req.session.userId], (err, result) => {
        if (err) {
            console.error('Error updating admin profile:', err);
            return res.status(500).json({ error: 'حدث خطأ في تحديث البيانات' });
        }
        
        // Update session
        req.session.userName = name;
        res.json({ success: true });
    });
});

// Change password
router.post('/settings/change-password', checkAdminAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        // Get current password hash
        const query = 'SELECT mot_de_passe FROM utilisateurs WHERE id = ? AND rôle = "admin"';
        db.query(query, [req.session.userId], async (err, results) => {
            if (err || results.length === 0) {
                return res.status(500).json({ error: 'حدث خطأ في التحقق من كلمة المرور' });
            }

            const isValid = await bcrypt.compare(currentPassword, results[0].mot_de_passe);
            if (!isValid) {
                return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            // Update password
            const updateQuery = 'UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ? AND rôle = "admin"';
            db.query(updateQuery, [hashedPassword, req.session.userId], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'حدث خطأ في تحديث كلمة المرور' });
                }
                res.json({ success: true });
            });
        });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ error: 'حدث خطأ في تحديث كلمة المرور' });
    }
});

// User Messages route - update the path
router.get('/user-messages', checkAdminAuth, (req, res) => {
    const query = `
        SELECT m.*, DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i') as created_at 
        FROM contacts m 
        ORDER BY m.created_at DESC
    `;
    
    db.query(query, (err, messages) => {
        if (err) {
            console.error('Error fetching messages:', err);
            return res.render('user-messages/index', {
                title: 'رسائل المستخدمين - TN M3allim',
                user: {
                    id: req.session.userId,
                    role: req.session.userRole,
                    name: req.session.userName
                },
                messages: [],
                totalMessages: 0
            });
        }

        res.render('user-messages/index', {
            title: 'رسائل المستخدمين - TN M3allim',
            user: {
                id: req.session.userId,
                role: req.session.userRole,
                name: req.session.userName
            },
            messages: messages,
            totalMessages: messages.length
        });
    });
});

// Update delete message route path
router.delete('/user-messages/:id', checkAdminAuth, (req, res) => {
    const query = 'DELETE FROM contacts WHERE id = ?';  // Changed from 'messages' to 'contacts'
    
    db.query(query, [req.params.id], (err, result) => {
        if (err) {
            console.error('Error deleting message:', err);
            return res.status(500).json({ error: 'Error deleting message' });
        }
        res.json({ success: true });
    });
});


module.exports = router;