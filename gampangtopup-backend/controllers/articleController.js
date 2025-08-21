const db = require('../config/db'); // Sesuaikan path ke koneksi database Anda
const slugify = require('slugify'); // Library untuk membuat slug URL

// ---------------------------------
// UNTUK DILIHAT PENGGUNA (PUBLIC)
// ---------------------------------

// 1. Mengambil SEMUA artikel yang sudah di-publish
exports.getAllArticles = async (req, res) => {
  try {
    const [articles] = await db.query(
      "SELECT id, title, slug, thumbnail_url, author_name, created_at FROM articles WHERE status = 'published' ORDER BY created_at DESC"
    );
    res.json(articles);
  } catch (error) {
    console.error("Error fetching all articles:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 2. Mengambil artikel TERBARU (untuk homepage)
exports.getLatestArticles = async (req, res) => {
  const limit = parseInt(req.query.limit) || 3; // Default 3, sesuai frontend
  try {
    const [articles] = await db.query(
      "SELECT id, title, slug, thumbnail_url, author_name FROM articles WHERE status = 'published' ORDER BY created_at DESC LIMIT ?",
      [limit]
    );
    res.json(articles);
  } catch (error) {
    console.error("Error fetching latest articles:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 3. Mengambil SATU artikel berdasarkan slug-nya
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const [article] = await db.query(
      "SELECT title, content, thumbnail_url, author_name, created_at FROM articles WHERE slug = ? AND status = 'published'",
      [slug]
    );

    if (article.length === 0) {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.json(article[0]);
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
};