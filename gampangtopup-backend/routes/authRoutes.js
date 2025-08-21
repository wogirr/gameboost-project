const express = require('express');
const router = express.Router();
const passport = require('passport'); // Untuk autentikasi dengan pihak ketiga (Google, Facebook)
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Untuk Google Login (contoh dengan Passport)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  authController.googleAuthCallback); // Controller untuk menangani respons dari Google

// Untuk Facebook Login (contoh dengan Passport)
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  authController.facebookAuthCallback); // Controller untuk menangani respons dari Facebook

module.exports = router;