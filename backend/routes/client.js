const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { checkClientAuth,checkAuth } = require('../middleware/auth');

router.get('/', checkClientAuth, (req, res) => {
    const query = `
        SELECT a.*, u.nom, u.email, u.photo_profile 
        FROM artisans a 
        JOIN utilisateurs u ON a.utilisateur_id = u.id
        WHERE u.rôle = 'artisan'
    `;
    
    db.query(query, (err, artisans) => {
        if (err) {
            console.error('Error fetching artisans:', err);
            return res.render('client/index', { 
                title: 'TN M3allim - Client',
                artisans: []
            });
        }

        const formattedArtisans = artisans.map(artisan => ({
            id: artisan.id,
            nom: artisan.nom,
            spécialité: artisan.spécialité,
            localisation: artisan.localisation,
            rating: artisan.rating || 0,
            disponibilité: artisan.disponibilité || false,
            expérience: artisan.expérience,
            photo_profile: artisan.photo_profile ? Buffer.from(artisan.photo_profile).toString('base64') : null
        }));

        res.render('client/index', { 
            title: 'TN M3allim - Client',
            artisans: formattedArtisans
        });
    });
});

// Update the route path by removing 'artisan' prefix
router.get('/get-gallery/:artisanId', (req, res) => {
    const artisanId = req.params.artisanId;
    
    const galleryQuery = `
        SELECT id, image_path AS image_data
        FROM gallery
        WHERE artisan_id = ?
    `;
    
    db.query(galleryQuery, [artisanId], (err, results) => {
        if (err) {
            console.error('Error fetching gallery:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        const gallery = results.map(item => ({
            id: item.id,
            image_data: item.image_data ? item.image_data.toString('base64') : null,
            preview: `/public/uploads/gallery/${item.image_data}`
        }));
        
        res.json(gallery);
    });
});

module.exports = router;