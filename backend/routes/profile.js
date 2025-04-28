const express = require('express');
const router = express.Router();

const bcrypt = require('bcrypt');
const db = require('../config/database');
const upload = require('../config/upload');
const { checkAuth, checkArtisanAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// Route pour la page profile
router.get('/', checkArtisanAuth,checkAuth, (req, res) => {
    res.render('profile/index', {
        title: 'الملف الشخصي- TN M3allim',
        user: req.session.userId ? {
            id: req.session.userId,
            role: req.session.userRole,
            name: req.session.userName
        } : null
    });
});
const galleryDir = path.join(__dirname, '..', 'public', 'uploads', 'gallery');

// Get profile data
router.get('/data', checkAuth, (req, res) => {
    const userId = req.session.userId;
    
    const query = `
        SELECT u.*, 
               a.spécialité, 
               a.expérience, 
               a.localisation,
               a.rating, 
               a.disponibilité,
               a.description,
               a.tarif_horaire
        FROM utilisateurs u
        LEFT JOIN artisans a ON u.id = a.utilisateur_id
        WHERE u.id = ?
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching profile data:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = results[0];
        console.log(userData)
        
        // Convert photo buffer to base64 if it exists
        const photo_profile = userData.photo_profile 
            ? `data:image/jpeg;base64,${userData.photo_profile}`
            : null;

        const response = {
            id: userData.id,
            name: userData.nom,
            email: userData.email,
            phone: userData.telephone,
            address: userData.adresse,
            governorate: userData.gouvernorat,
            city: userData.ville,
            postal_code: userData.code_postal,
            photo_profile: photo_profile,
            rôle: userData.rôle,
            artisan: userData.spécialité ? {
                spécialité: userData.spécialité,
                expérience: userData.expérience,
                localisation: userData.localisation,
                description: userData.description,
                rating: userData.rating,
                disponibilité: userData.disponibilité,
                tarif_horaire: userData.tarif_horaire || 0
            } : null
        };

        res.json(response);
    });
});

// Create directories (move this near the top with other initialization code)
// Add this after the imports
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(galleryDir)) {
    fs.mkdirSync(galleryDir, { recursive: true });
}

// Keep existing routes (/, /data)
router.post('/update-profile', checkAuth, upload.fields([
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'galleryImages', maxCount: 10 }
]), async (req, res) => {
    const userId = req.session.userId;
    const userRole = req.session.userRole;
    
    try {
        // Get form data
        const { 
            fullname, phone, address, governorate, city, postalCode,
            currentPassword, newPassword,
            profession, experience, hourlyRate, description
        } = req.body;
        
        // Update basic user information without using transactions
        const updateUserQuery = `
            UPDATE utilisateurs 
            SET nom = ?, telephone = ?, adresse = ?, gouvernorat = ?, ville = ?, code_postal = ?
            WHERE id = ?
        `;
        
        db.query(
            updateUserQuery,
            [fullname, phone, address, governorate, city, postalCode, userId],
            async (err, result) => {
                if (err) {
                    console.error('Error updating user data:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Error updating user data: ' + err.message
                    });
                }
                
                // Handle password change if requested
                if (currentPassword && newPassword) {
                    try {
                        // Verify current password
                        const userQuery = 'SELECT mot_de_passe FROM utilisateurs WHERE id = ?';
                        db.query(userQuery, [userId], async (err, userResults) => {
                            if (err) {
                                console.error('Error fetching user password:', err);
                                return res.status(500).json({ 
                                    success: false, 
                                    message: 'Error verifying password'
                                });
                            }
                            
                            if (userResults.length === 0) {
                                return res.status(404).json({
                                    success: false,
                                    message: 'User not found'
                                });
                            }
                            
                            const isPasswordValid = await bcrypt.compare(currentPassword, userResults[0].mot_de_passe);
                            
                            if (!isPasswordValid) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'Current password is incorrect'
                                });
                            }
                            
                            // Hash new password
                            const hashedPassword = await bcrypt.hash(newPassword, 10);
                            
                            // Update password
                            const updatePasswordQuery = 'UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?';
                            db.query(updatePasswordQuery, [hashedPassword, userId], (err, result) => {
                                if (err) {
                                    console.error('Error updating password:', err);
                                }
                            });
                        });
                    } catch (error) {
                        console.error('Password update error:', error);
                    }
                }
                
                // Handle profile photo
                // In the update-profile route
                if (req.files && req.files.profilePhoto) {
                    const profilePhoto = req.files.profilePhoto[0];
                    const photoFileName = `${userId}_${Date.now()}${path.extname(profilePhoto.originalname)}`;
                    const photoPath = path.join('uploads/profiles', photoFileName);
                    console.log(profilePhoto,photoFileName,photoPath)
                    
                    // Save file to disk
                    fs.writeFileSync(path.join(__dirname, '..', 'public', photoPath), profilePhoto.buffer);
                    
                    // Update database with filename
                    const updatePhotoQuery = 'UPDATE utilisateurs SET photo_profile = ? WHERE id = ?';
                    db.query(updatePhotoQuery, [photoFileName, userId], (err, result) => {
                        if (err) {
                            console.error('Error updating profile photo:', err);
                        }
                    });
                }
                
                // Update artisan-specific information if user is an artisan
                // Inside the update-profile route, after handling artisan profile
                if (userRole === 'artisan') {
                    const checkArtisanQuery = 'SELECT id FROM artisans WHERE utilisateur_id = ?';
                    db.query(checkArtisanQuery, [userId], (err, artisanResults) => {
                        if (err) {
                            console.error('Error checking artisan profile:', err);
                            return;
                        }
                        
                        if (artisanResults && artisanResults.length > 0) {
                            // Update existing artisan profile
                            // In the update-profile route where artisan data is updated
                            const updateArtisanQuery = `
                                UPDATE artisans 
                                SET spécialité = ?, 
                                    expérience = ?, 
                                    localisation = ?,
                                    tarif_horaire = ?
                                WHERE utilisateur_id = ?
                            `;
                            
                            db.query(
                                updateArtisanQuery,
                                [profession, experience, address, hourlyRate, userId],
                                (err, result) => {
                                    if (err) {
                                        console.error('Error updating artisan profile:', err);
                                    }
                                }
                            );
                        } else {
                            // Create new artisan profile
                            const createArtisanQuery = `
                                INSERT INTO artisans (utilisateur_id, spécialité, expérience, localisation)
                                VALUES (?, ?, ?, ?)
                            `;
                            
                            db.query(
                                createArtisanQuery,
                                [userId, profession, experience, address],
                                (err, result) => {
                                    if (err) {
                                        console.error('Error creating artisan profile:', err);
                                    }
                                }
                            );
                        }
                        
                        // Add gallery images handling
                        // Inside the artisan profile update section where gallery images are handled
                        if (req.files && req.files.galleryImages) {
                            const artisanId = artisanResults[0].id;
                            console.log('Uploading gallery images for artisan:', artisanId); // Debug log
                            
                            // Handle each gallery image
                            const promises = req.files.galleryImages.map(image => {
                                return new Promise((resolve, reject) => {
                                    const imageFileName = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}${path.extname(image.originalname)}`;
                                    console.log('Processing image:', imageFileName); // Debug log
                                    
                                    // Save file to disk
                                    fs.writeFile(
                                        path.join(__dirname, '..', 'public', 'uploads', 'gallery', imageFileName),
                                        image.buffer,
                                        async (err) => {
                                            if (err) {
                                                console.error('Error saving file:', err);
                                                reject(err);
                                                return;
                                            }
                                            
                                            // Save to database with error handling
                                            try {
                                                const insertGalleryQuery = 'INSERT INTO gallery (artisan_id, image_path) VALUES (?, ?)';
                                                const result = await new Promise((resolve, reject) => {
                                                    db.query(insertGalleryQuery, [artisanId, imageFileName], (err, result) => {
                                                        if (err) {
                                                            console.error('Database error:', err);
                                                            reject(err);
                                                            return;
                                                        }
                                                        console.log('Image saved to database:', result); // Debug log
                                                        resolve(result);
                                                    });
                                                });
                                                resolve(result);
                                            } catch (error) {
                                                console.error('Error saving to database:', error);
                                                reject(error);
                                            }
                                        }
                                    );
                                });
                            });
                            
                            // Wait for all images to be processed
                            Promise.all(promises)
                                .then(() => {
                                    console.log('All gallery images saved successfully');
                                })
                                .catch(err => {
                                    console.error('Error processing gallery images:', err);
                                });
                        }
                    });
                }
                
                // Update session name if it changed
                if (fullname && fullname !== req.session.userName) {
                    req.session.userName = fullname;
                }
                
                res.json({ success: true, message: 'تم تحديث الملف الشخصي بنجاح' });
            }
        );
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'حدث خطأ أثناء تحديث الملف الشخصي'
        });
    }
});


router.get('/gallery', checkAuth, (req, res) => {
    const userId = req.session.userId;
    
    const checkArtisanQuery = `
        SELECT id FROM artisans WHERE utilisateur_id = ?
    `;
    
    db.query(checkArtisanQuery, [userId], (err, artisanResults) => {
        if (err) {
            console.error('Error checking artisan:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!artisanResults || artisanResults.length === 0) {
            console.log('No artisan found for user:', userId);
            return res.json([]);
        }
        
        const artisanId = artisanResults[0].id;
        
        const galleryQuery = `
            SELECT id, image_path
            FROM gallery
            WHERE artisan_id = ?
        `;
        
        db.query(galleryQuery, [artisanId], (err, results) => {
            if (err) {
                console.error('Error fetching gallery:', err);
                return res.status(500).json({ error: 'Database error' });
            }
            
            console.log('Gallery results:', results); // Debug log
            
            const gallery = results.map(item => ({
                id: item.id,
                filename: item.image_path,
                // Update the preview path to include the full URL structure
                preview: `/public/uploads/gallery/${item.image_path}`
            }));
            
            res.json(gallery);
        });
    });
});
module.exports = router;