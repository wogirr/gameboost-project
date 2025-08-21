const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Ambil token dari header 'Authorization'
    const authHeader = req.headers.authorization;

    // Jika header ada dan formatnya benar ('Bearer [token]')
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        
        // Verifikasi token
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            // Jika token tidak valid (misal, expired), kita abaikan saja
            // dan perlakukan sebagai guest.
            if (!err) {
                // Jika token valid, tambahkan data user ke request
                req.user = user;
            }
            // Lanjutkan ke proses berikutnya, baik token valid maupun tidak
            next();
        });
    } else {
        // Jika tidak ada header Authorization, langsung lanjutkan
        // req.user akan undefined, menandakan ini adalah guest.
        next();
    }
};
