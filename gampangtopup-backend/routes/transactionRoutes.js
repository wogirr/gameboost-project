const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middleware/authMiddleware');
const authMiddlewareOptional = require('../middleware/authMiddlewareOptional');

// MODIFIKASI: Ganti nama route dari '/' menjadi '/checkout' agar lebih jelas
// dan gunakan middleware opsional
router.post('/checkout', authMiddlewareOptional, transactionController.createTransaction);

router.get('/history', authMiddlewareOptional, transactionController.getUserTransactions);

router.post('/midtrans-notification', transactionController.handleMidtransNotification);

module.exports = router;