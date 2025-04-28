const express = require('express');
const session = require('express-session');
const path = require('path');

const setupMiddleware = (app) => {
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Session configuration
    app.use(session({
        secret: 'your-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, 
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 
        }
    }));
};

module.exports = { setupMiddleware };