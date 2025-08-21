// File ini akan menjadi satu-satunya sumber kebenaran
// untuk menampilkan UI login/profil di semua halaman.
document.addEventListener('DOMContentLoaded', () => {
    // Tentukan container di header tempat UI akan ditampilkan
    const authUIContainer = document.getElementById('user-auth-section');
    if (!authUIContainer) return; // Jika tidak ada container, hentikan

    // =========================================================================
    // ===== BARU: Blok untuk menangani token dari URL (Social Login) ======
    // =========================================================================
    // Logika ini dipindahkan dari auth.js ke sini agar berjalan di semua halaman.
    const urlParams = new URLSearchParams(window.location.search);
    const socialToken = urlParams.get('social_token');
    const userData = urlParams.get('user');

    if (socialToken && userData) {
        // 1. Simpan token dan data user dari social login ke localStorage
        localStorage.setItem('gampang-topup-token', socialToken);
        localStorage.setItem('gampang-topup-user', decodeURIComponent(userData));

        // 2. Bersihkan URL agar token tidak terlihat di address bar.
        // Ini lebih baik daripada redirect, karena tidak me-reload halaman.
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    // =========================================================================

    // Generate device ID jika belum ada
    if (!localStorage.getItem('userDeviceID') && !localStorage.getItem('gampang-topup-token')) {
        localStorage.setItem('userDeviceID', 'Guest_' + Math.random().toString(36).substr(2, 9));
    }

    // Ambil data dari localStorage dengan KUNCI STANDAR
    const token = localStorage.getItem('gampang-topup-token');
    const userJSON = localStorage.getItem('gampang-topup-user');

    if (token && userJSON) {
        try {
            const user = JSON.parse(userJSON);
            renderUserProfile(authUIContainer, user);
        } catch (e) {
            console.error("Gagal mem-parsing data user, membersihkan...", e);
            cleanupAndRenderLogin(authUIContainer);
        }
    } else {
        renderLoginButton(authUIContainer);
    }
});

function renderUserProfile(container, user) {
    const userName = user.username || 'User';
    const userEmail = user.email || '';
    const userInitial = userName.charAt(0).toUpperCase();

    container.innerHTML = `
        <div class="user-profile-dropdown">
            <button class="user-avatar-button" id="profile-dropdown-btn">
                <div class="avatar-circle">${userInitial}</div>
                <span>${userName}</span>
            </button>
            <div class="dropdown-content">
                <div class="dropdown-header">
                    <strong>${userName}</strong>
                    <small>${userEmail}</small>
                </div>
                <a href="profile.html"><i class="fas fa-user-circle"></i> Profile</a>
                <a href="riwayat.html"><i class="fas fa-history"></i> Riwayat Transaksi</a>
                <a href="#" id="global-logout-btn"><i class="fas fa-sign-out-alt"></i> Keluar</a>
            </div>
        </div>
    `;

    const dropdownBtn = document.getElementById('profile-dropdown-btn');
    const dropdownContent = document.querySelector('.dropdown-content');

    // Toggle dropdown saat tombol diklik
    dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.classList.toggle('active');
    });

    // Tutup dropdown saat klik di luar
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.user-profile-dropdown')) {
            dropdownContent.classList.remove('active');
        }
    });

    // Event listener untuk logout
    document.getElementById('global-logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        cleanupAndRenderLogin(container);
        alert('Anda telah berhasil keluar.');
        // Arahkan ke halaman utama setelah logout
        if (window.location.pathname.includes('profile.html') || window.location.pathname.includes('riwayat.html')) {
            window.location.href = 'index.html';
        }
    });
}

/**
 * Menampilkan tombol Masuk/Daftar untuk user yang belum login (Guest)
 * @param {HTMLElement} container - Elemen div #user-section
 */

function renderLoginButton(container) {
    container.innerHTML = `<a href="login.html" class="btn btn-primary">Masuk/Daftar</a>`;
}

function cleanupAndRenderLogin(container) {
    localStorage.removeItem('gampang-topup-token');
    localStorage.removeItem('gampang-topup-user');
    renderLoginButton(container);
}