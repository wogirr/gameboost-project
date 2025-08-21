document.addEventListener('DOMContentLoaded', () => {

    // ================== BARU: Tangani Token dari Social Login ==================
    const urlParams = new URLSearchParams(window.location.search);
    const socialToken = urlParams.get('social_token');
    const userData = urlParams.get('user');

    if (socialToken && userData) {
        // Simpan token dan data user dari social login
        // Kode BARU di auth.js
        // Menggunakan nama kunci yang standar dan lebih spesifik
        localStorage.setItem('gampang-topup-token', socialToken);
        localStorage.setItem('gampang-topup-user', decodeURIComponent(userData));

        // Tampilkan pesan sukses dan redirect
        const messageDiv = document.getElementById('auth-message');
        messageDiv.textContent = 'Login via sosial media berhasil! Mengalihkan...';
        messageDiv.className = 'auth-message success';
        
        setTimeout(() => {
            // Hapus parameter dari URL dan redirect ke halaman utama
            window.location.href = 'http://127.0.0.1:5500/frontend/user/index.html';
        }, 1500);
    }
    // ========================================================================

    
    // Elemen-elemen UI
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const termsCheckbox = document.getElementById('terms-checkbox');
    const registerButton = document.getElementById('register-button');
    const messageDiv = document.getElementById('auth-message');

    // Fungsi untuk menampilkan pesan
    const showMessage = (message, type) => {
        messageDiv.textContent = message;
        messageDiv.className = `auth-message ${type}`; // type bisa 'success' atau 'error'
    };

    // 1. Logika Pindah Tab (Login <-> Register)
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        messageDiv.style.display = 'none'; // Sembunyikan pesan saat ganti tab
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.style.display = 'block';
        loginForm.style.display = 'none';
        messageDiv.style.display = 'none'; // Sembunyikan pesan saat ganti tab
    });

    // 2. Logika Checkbox Syarat & Ketentuan
    if (termsCheckbox && registerButton) {
        termsCheckbox.addEventListener('change', () => {
            // Tombol register hanya aktif jika checkbox dicentang
            registerButton.disabled = !termsCheckbox.checked;
        });
    }

    // 3. Logika Submit Form Register
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Mencegah form reload halaman
        showMessage('Mendaftarkan...', 'info'); // Memberi feedback ke user

        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        
        // Ambil token reCAPTCHA
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
            showMessage('Silakan verifikasi bahwa Anda bukan robot.', 'error');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, 'g-recaptcha-response': recaptchaResponse })
            });

            const data = await response.json();

            if (!response.ok) {
                // Jika ada error dari server (misal: email sudah terdaftar)
                throw new Error(data.error || 'Terjadi kesalahan');
            }
            
            showMessage('Pendaftaran berhasil! Silakan masuk.', 'success');
            // Reset form dan pindah ke tab login
            registerForm.reset();
            grecaptcha.reset();
            loginTab.click();

        } catch (err) {
            showMessage(err.message, 'error');
        }
    });

    // 4. Logika Submit Form Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        showMessage('Memproses masuk...', 'info');

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Terjadi kesalahan');
            }
            
            // Simpan token ke localStorage (penyimpanan di browser)
            // Kode BARU di auth.js
            // Menggunakan nama kunci yang standar dan lebih spesifik
            localStorage.setItem('gampang-topup-token', data.token);
            localStorage.setItem('gampang-topup-user', JSON.stringify(data.user));
            localStorage.removeItem('userDeviceID'); // Hapus device ID saat login

            showMessage('Login berhasil! Mengalihkan...', 'success');
            
            // Arahkan ke halaman utama setelah 1 detik
            setTimeout(() => {
                window.location.href = 'http://127.0.0.1:5500/frontend/user/index.html'; 
            }, 1000);

        } catch (err) {
            showMessage(err.message, 'error');
        }
    });
});