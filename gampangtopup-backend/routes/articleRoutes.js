const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');

// === PUBLIC ROUTES ===
// GET /api/articles/latest -> Mengambil artikel terbaru (untuk homepage)
// PENTING: Route ini harus ada SEBELUM /:slug agar tidak tertukar
router.get('/latest', articleController.getLatestArticles);

// GET /api/articles -> Mengambil semua artikel (untuk halaman /artikel.html)
router.get('/', articleController.getAllArticles);

// GET /api/articles/:slug -> Mengambil satu artikel spesifik (untuk /artikel-detail.html)
router.get('/:slug', articleController.getArticleBySlug);


module.exports = router;