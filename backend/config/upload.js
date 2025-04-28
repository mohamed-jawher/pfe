const multer = require('multer');

// Configuration de Multer pour le stockage en mémoire
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

module.exports = upload;