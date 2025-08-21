// 1. Import Library/Dependencies yang Dibutuhkan
// ======================================================
require('dotenv').config(); // Memuat variabel lingkungan dari file .env
const express = require('express'); // Framework Express.js
const cors = require('cors'); // Middleware untuk Cross-Origin Resource Sharing
const bodyParser = require('body-parser'); // Middleware untuk mengurai body permintaan
const session = require('express-session'); // Diperlukan untuk Passport.js (manajemen sesi)
const passport = require('passport'); // Untuk autentikasi dengan pihak ketiga (Google, Facebook)
const GoogleStrategy = require('passport-google-oauth20').Strategy; // Strategi Google untuk Passport
const FacebookStrategy = require('passport-facebook').Strategy; // Strategi Facebook untuk Passport

// 2. Import File Konfigurasi dan Rute Lokal
// ======================================================
const db = require('./config/db'); // Koneksi database Anda

// 3. Inisialisasi Aplikasi Express
// ======================================================
const app = express();

// Menentukan Port dan Menjalankan Server
// ======================================================
const PORT = process.env.PORT || 5000;

// 4. Middleware Global (Menerapkan ke Semua Permintaan)
// ======================================================
app.use(cors()); // Mengizinkan permintaan dari domain lain (misalnya frontend)
app.use(bodyParser.json()); // Mengurai body permintaan dalam format JSON
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware untuk menyajikan file statis dari folder 'images' (gambar statis pra-ada)
// Ketika frontend request ke /images/nama_file.png, Express akan mencarinya di ./images/nama_file.png
app.use('/images', express.static('images')); // <-- TAMBAHKAN BARIS INI

// Test koneksi database
db.getConnection()
  .then(connection => {
    console.log('Database connected successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('Database connection failed:', err);
  });

// Konfigurasi Session untuk Passport.js (Penting!)
app.use(session({
  secret: process.env.SESSION_SECRET || '281f68275d8b9fda6bcbd4befc1fe38066a8bd1997e60906be63bf671a2e8bf1889efcecb31eeff0192207cbf8a3dd1aad0a536339c9fb685f59d8ae37a07531', // Ambil dari .env atau fallback
  resave: false, // Jangan simpan ulang sesi jika tidak ada perubahan
  saveUninitialized: false, // Jangan buat sesi jika belum diinisialisasi
  cookie: { secure: process.env.NODE_ENV === 'production' } // Gunakan secure cookie di production (HTTPS)
}));

// Inisialisasi Passport.js
app.use(passport.initialize());
app.use(passport.session()); // Pastikan ini setelah session middleware

// 5. Konfigurasi Strategi Passport.js (untuk Google/Facebook Login)
// ======================================================
// Untuk Google OAuth
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/api/auth/google/callback" // Harus cocok dengan yang didaftarkan di Google Console
  },
  (accessToken, refreshToken, profile, done) => {
    // Fungsi ini akan dijalankan setelah Google berhasil mengautentikasi pengguna.
    // 'profile' berisi data pengguna dari Google (id, displayName, emails, photos, dll).
    // Anda bisa menyimpan 'profile' ini atau sebagian darinya ke dalam req.user
    // dan melanjutkan ke controller authController.googleAuthCallback.
    done(null, profile);
  }
));

// Untuk Facebook OAuth
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback", // Harus cocok dengan yang didaftarkan di Facebook Developer
    profileFields: ['id', 'displayName', 'emails'] // Data yang diminta dari Facebook
  },
  (accessToken, refreshToken, profile, done) => {
    // Fungsi ini akan dijalankan setelah Facebook berhasil mengautentikasi pengguna.
    // 'profile' berisi data pengguna dari Facebook.
    done(null, profile);
  }
));

// Serialisasi dan Deserialisasi user untuk Passport session
// Ini untuk bagaimana data user disimpan/diambil dari session (cookie)
passport.serializeUser((user, done) => {
  done(null, user); // Simpan seluruh objek user ke session (bisa juga hanya user.id)
});

passport.deserializeUser((obj, done) => {
  done(null, obj); // Ambil objek user dari session
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/game', require('./routes/gameRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/user', require('./routes/userRoutes'));
app.use('/api/articles', require('./routes/articleRoutes'));

// server.js (tambahkan baris ini)
app.use('/api/admin', require('./routes/adminRoutes'));

// Route sederhana untuk test
app.get('/', (req, res) => {
  res.send('GampangTopup API is running!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});