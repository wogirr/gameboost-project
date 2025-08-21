const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Rute ini akan dilindungi, hanya user yang login bisa mengakses profilnya sendiri
router.get('/profile' ,authMiddleware, userController.getUserProfile);

module.exports = router;