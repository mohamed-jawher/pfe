const bcrypt = require('bcrypt');
const db = require('../config/database');

async function updateAdminPassword() {
    const newPassword = 'admin123'; // Change this to your desired new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const query = 'UPDATE utilisateurs SET mot_de_passe = ? WHERE rôle = "admin"';
    
    db.query(query, [hashedPassword], (err, result) => {
        if (err) {
            console.error('Error updating password:', err);
            process.exit(1);
        }
        
        console.log('Admin password updated successfully!');
        console.log('New password:', newPassword);
        process.exit(0);
    });
}

updateAdminPassword();