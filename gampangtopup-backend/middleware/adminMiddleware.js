module.exports = (req, res, next) => {
    // Setelah authMiddleware, req.user sudah terisi
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  };