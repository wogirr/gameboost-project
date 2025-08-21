const db = require('../config/db');

// GANTI SELURUH FUNGSI getUserProfile DI userController.js DENGAN INI

const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const [userResult] = await db.query(
            `SELECT id, username, email, created_at, gampang_coin_balance FROM users WHERE id = ?`, // Ambil semua data yg relevan
            [userId]
        );

        if (userResult.length === 0) {
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }
        const user = userResult[0];

        const [statsResult] = await db.query(
            `SELECT
                COUNT(*) AS total_transactions,
                COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN total_price ELSE 0 END), 0) AS total_sales,
                COALESCE(SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END), 0) AS pending_count,
                COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END), 0) AS success_count,
                COALESCE(SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed_count
            FROM transactions
            WHERE user_id = ?`,
            [userId]
        );
        const stats = statsResult[0];

        const profileData = {
            user: {
                name: user.name || user.username, // Gunakan username jika nama kosong
                email: user.email,
                member_since: user.created_at,
                gampang_coins: user.gampang_coin_balance || 0
            },
            stats: {
                total_transactions: stats.total_transactions,
                total_sales: parseInt(stats.total_sales),
                menunggu: stats.pending_count,
                dalam_proses: 0,
                berhasil: stats.success_count,
                gagal: stats.failed_count
            }
        };

        res.json(profileData);

    } catch (err) {
        // PERUBAHAN PENTING ADA DI SINI
        console.error("=========================================");
        console.error("FATAL ERROR di getUserProfile:");
        console.error("Pesan Error   :", err.message);
        console.error("Kode Error DB :", err.code);
        console.error("=========================================");
        res.status(500).json({ error: 'Terjadi kesalahan internal pada server saat mengambil data profil.' });
    }
};

module.exports = {
    getUserProfile
};