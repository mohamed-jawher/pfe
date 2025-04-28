const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'mail.itqanlabs.com',
    port: 587,
    secure: false,
    auth: {
        user: 'tnm3allim-project@itqanlabs.com',
        pass: 'IneF9VHsJgBdQK5'
    },
    tls: {
        rejectUnauthorized: false
    }
});

module.exports = transporter;