const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkArtisanAuth, checkAuth } = require('../middleware/auth');  // Updated import

// Route pour la page artisan
router.get('/', checkArtisanAuth, (req, res) => {  // Changed from checkArtisanRole to checkArtisanAuth
    res.render('artisan/index', {
        title: 'لوحة التحكم - TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});

// Get artisan data
router.get('/get-artisans', (req, res) => {
    const query = `
        SELECT a.*, u.nom, u.email, u.photo_profile,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE artisan_id = a.id), 0) as rating,
        COALESCE((SELECT COUNT(*) FROM reviews WHERE artisan_id = a.id), 0) as review_count
        FROM artisans a 
        JOIN utilisateurs u ON a.utilisateur_id = u.id
        WHERE u.rôle = 'artisan'
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching artisans:', err);
            return res.status(500).json({ error: 'Error fetching artisans' });
        }
        res.json(results);
    });
});

// Get specific artisan - modified to work with ID parameter
router.get('/get-artisan/:id', (req, res) => {
    const query = `
        SELECT a.*, u.nom, u.email, u.photo_profile,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE artisan_id = a.id), 0) as rating,
        COALESCE((SELECT COUNT(*) FROM reviews WHERE artisan_id = a.id), 0) as review_count
        FROM artisans a 
        JOIN utilisateurs u ON a.utilisateur_id = u.id
        WHERE a.id = ? AND u.rôle = 'artisan'
    `;
    
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching artisan:', err);
            return res.status(500).json({ error: 'Error fetching artisan details' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Artisan not found' });
        }

        // Convert Buffer to base64 string if photo exists
        const artisan = results[0];
        if (artisan.photo_profile) {
            artisan.photo_profile = Buffer.from(artisan.photo_profile);
        }

        res.json(artisan);
    });
});

// Get artisan reviews
router.get('/get-reviews/:artisanId', async (req, res) => {
    try {
        const query = `
            SELECT r.*, u.nom as user_name
            FROM reviews r 
            JOIN utilisateurs u ON r.user_id = u.id 
            WHERE r.artisan_id = ? 
            ORDER BY r.created_at DESC
        `;
        
        db.query(query, [req.params.artisanId], (err, results) => {
            if (err) throw err;
            res.json(results);
        });
    } catch (error) {
        res.status(500).json({ error: 'Error fetching reviews' });
    }
});

// Submit a review
router.post('/submit-review', checkAuth, async (req, res) => {
    try {
        const { artisanId, rating, review } = req.body;
        
        // Check if user is logged in
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Please login to submit a review' });
        }

        const query = `
            INSERT INTO reviews (user_id, artisan_id, rating, review_text, created_at) 
            VALUES (?, ?, ?, ?, NOW())
        `;
        
        db.query(query, [req.session.userId, artisanId, rating, review], (err, results) => {
            if (err) {
                console.error('Error submitting review:', err);
                return res.status(500).json({ error: 'Error submitting review' });
            }
            
            // Update artisan's average rating
            const updateRatingQuery = `
                UPDATE artisans 
                SET rating = (
                    SELECT AVG(rating) 
                    FROM reviews 
                    WHERE artisan_id = ?
                )
                WHERE id = ?
            `;
            
            db.query(updateRatingQuery, [artisanId, artisanId], (err) => {
                if (err) {
                    console.error('Error updating artisan rating:', err);
                }
            });

            res.json({ success: true });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Error submitting review' });
    }
});

// Book an artisan
router.post('/book-artisan', checkAuth, async (req, res) => {
    try {
        const { artisanId, date, time, notes } = req.body;
        const userId = req.session.userId;

        const query = `
            INSERT INTO bookings (user_id, artisan_id, booking_date, booking_time, notes) 
            VALUES (?, ?, ?, ?, ?)
        `;
        
        db.query(query, [userId, artisanId, date, time, notes], (err, results) => {
            if (err) throw err;
            res.json({ success: true });
        });
    } catch (error) {
        res.status(500).json({ error: 'Error booking artisan' });
    }
});

// Add report problem route
router.get('/report-problem', checkArtisanAuth, (req, res) => {
    res.render('report-problem/index', {
        title: 'الإبلاغ عن مشكلة - TN M3allim',
        user: {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        },
        active: 'report'
    });
});

// Add POST route for handling report submissions
router.post('/report-problem', checkArtisanAuth, (req, res) => {
    const { navigation, design, comments } = req.body;
    const userId = req.session.userId;

    // First get the artisan_id from the artisans table
    const getArtisanIdQuery = `
        SELECT id FROM artisans WHERE utilisateur_id = ?
    `;

    db.query(getArtisanIdQuery, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching artisan id:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'حدث خطأ أثناء معالجة الطلب' 
            });
        }

        if (results.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'لم يتم العثور على معرف الحرفي' 
            });
        }

        const artisanId = results[0].id;

        // Now insert the report with the correct artisan_id
        const insertReportQuery = `
            INSERT INTO reports (artisan_id, navigation_issue, design_issue, comments)
            VALUES (?, ?, ?, ?)
        `;

        db.query(insertReportQuery, [artisanId, navigation, design, comments], (err, results) => {
            if (err) {
                console.error('Error saving report:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'حدث خطأ أثناء حفظ التقرير' 
                });
            }

            res.json({ 
                success: true, 
                message: 'تم إرسال التقرير بنجاح' 
            });
        });
    });
});

// Get profile page with artisan data
router.get('/profile', checkArtisanAuth, async (req, res) => {
    try {
        const query = `
            SELECT u.*, a.*
            FROM utilisateurs u
            JOIN artisans a ON u.id = a.utilisateur_id
            WHERE u.id = ?
        `;
        
        db.query(query, [req.session.userId], (err, results) => {
            if (err) throw err;
            
            const profile = results[0];
            res.render('profile/index', {
                title: 'الملف الشخصي - TN M3allim',
                user: {
                    id: req.session.userId,
                    role: req.session.userRole,
                    name: req.session.userName
                },
                profile: profile,
                active: 'profile'
            });
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading profile');
    }
});

// Update profile
router.post('/profile/update', checkArtisanAuth, async (req, res) => {
    try {
        const { fullname, phone, address, profession, experience, hourly_rate, description } = req.body;
        
        // Update user table
        const updateUserQuery = `
            UPDATE utilisateurs 
            SET nom = ?, téléphone = ?, adresse = ?
            WHERE id = ?
        `;
        
        db.query(updateUserQuery, [fullname, phone, address, req.session.userId], async (err) => {
            if (err) throw err;

            // Update artisan table
            const updateArtisanQuery = `
                UPDATE artisans 
                SET métier = ?, années_expérience = ?, tarif_horaire = ?, description = ?
                WHERE utilisateur_id = ?
            `;
            
            db.query(updateArtisanQuery, 
                [profession, experience, hourly_rate, description, req.session.userId], 
                (err) => {
                    if (err) throw err;
                    res.json({ 
                        success: true, 
                        message: 'تم تحديث الملف الشخصي بنجاح' 
                    });
                }
            );
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ أثناء تحديث الملف الشخصي' 
        });
    }
});

// Add reviews page route
router.get('/reviews', checkArtisanAuth, (req, res) => {
    res.render('artisan/reviews', {
        title: 'التقييمات - TN M3allim',
        user: {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        },
        active: 'reviews'
    });
});

// Get artisan's reviews data
router.get('/reviews/data', checkArtisanAuth, (req, res) => {
    // First get artisan_id
    const getArtisanIdQuery = `SELECT id FROM artisans WHERE utilisateur_id = ?`;
    
    db.query(getArtisanIdQuery, [req.session.userId], (err, artisanResults) => {
        if (err) {
            console.error('Error fetching artisan id:', err);
            return res.status(500).json({ error: 'Error fetching reviews' });
        }

        if (artisanResults.length === 0) {
            return res.status(404).json({ error: 'Artisan not found' });
        }

        const artisanId = artisanResults[0].id;

        // Then get reviews with user information
        const reviewsQuery = `
            SELECT r.*, u.nom as client_name, u.photo_profile as client_photo
            FROM reviews r
            JOIN utilisateurs u ON r.user_id = u.id
            WHERE r.artisan_id = ?
            ORDER BY r.created_at DESC
        `;

        db.query(reviewsQuery, [artisanId], (err, reviews) => {
            if (err) {
                console.error('Error fetching reviews:', err);
                return res.status(500).json({ error: 'Error fetching reviews' });
            }

            res.json({
                reviews: reviews.map(review => ({
                    id: review.id,
                    rating: review.rating,
                    comment: review.review_text,
                    clientName: review.client_name,
                    clientPhoto: review.client_photo,
                    createdAt: review.created_at
                }))
            });
        });
    });
});

module.exports = router;