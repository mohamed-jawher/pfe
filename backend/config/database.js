const mysql = require('mysql2');

// Connexion à la base de données MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'tn_m3allim'
});

module.exports = db;