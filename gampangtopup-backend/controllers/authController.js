const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const axios = require('axios'); // Kita butuh axios untuk verifikasi reCAPTCHA

// Pastikan kamu sudah `npm install axios`

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const recaptchaResponse = req.body['g-recaptcha-response'];

    // 1. Verifikasi reCAPTCHA
    if (!recaptchaResponse) {
        return res.status(400).json({ error: 'Verifikasi reCAPTCHA dibutuhkan.' });
    }

    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY; // Simpan di file .env
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaResponse}`;

    const { data } = await axios.post(verificationURL);
    
    if (!data.success) {
        return res.status(400).json({ error: 'Gagal verifikasi reCAPTCHA.' });
    }

    // 2. Cek jika email sudah terdaftar
    const [existingUser] = await db.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar' });
    }
    
    // 3. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // 4. Buat user baru
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Cek user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    
    const user = users[0];

    // Jika user terdaftar via Google/Facebook, mereka tidak punya password
    if (!user.password_hash) {
        return res.status(401).json({ error: 'Akun ini terdaftar melalui login sosial. Silakan masuk dengan Google/Facebook.' });
    }
    
    // Verifikasi password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }
    
    // Buat JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        gampang_coin_balance: user.gampang_coin_balance
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
};

// Fungsi Callback untuk Social Login
const handleSocialLogin = async (profile, provider, dbColumn, res) => {
    try {
        const providerId = profile.id;
        const email = profile.emails[0].value;
        const displayName = profile.displayName;

        // Cek apakah user sudah ada di DB berdasarkan ID provider (misal: google_id)
        let [users] = await db.query(`SELECT * FROM users WHERE ${dbColumn} = ?`, [providerId]);

        let user = users[0];

        if (!user) {
            // Jika belum ada, cek apakah email sudah terdaftar (dari login manual/provider lain)
            [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            user = users[0];

            if (user) {
                // Jika email sudah ada, update user lama dengan ID provider
                await db.query(`UPDATE users SET ${dbColumn} = ? WHERE email = ?`, [providerId, email]);
            } else {
                // Jika email belum ada, buat user baru
                const [result] = await db.query(
                    `INSERT INTO users (username, email, ${dbColumn}) VALUES (?, ?, ?)`,
                    [displayName, email, providerId]
                );
                // Ambil data user yang baru dibuat
                [users] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
                user = users[0];
            }
        }

        // Buat JWT token untuk aplikasi kita
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Redirect ke halaman frontend dengan token di URL query
        // Frontend akan mengambil token ini dari URL dan menyimpannya
        const frontendLoginUrl = 'http://127.0.0.1:5500/frontend/user/index.html'; 
        res.redirect(`${frontendLoginUrl}?social_token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`);

    } catch (err) {
        console.error(err);
        res.redirect('/login.html?error=social_login_failed');
    }
};

const googleAuthCallback = (req, res) => {
    handleSocialLogin(req.user, 'google', 'google_id', res);
};

const facebookAuthCallback = (req, res) => {
    handleSocialLogin(req.user, 'facebook', 'facebook_id', res);
};



module.exports = { register, login, googleAuthCallback, facebookAuthCallback };