document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'http://localhost:5000/api';

    // Cek apakah user sudah login
    const token = localStorage.getItem('gampang-topup-token');
    if (!token) {
        // Jika tidak ada token, arahkan ke halaman login
        alert('Anda harus login untuk melihat halaman ini.');
        window.location.href = 'http://127.0.0.1:5500/frontend/user/login.html';
        return;
    }

    // Ambil elemen UI
    const userAvatarEl = document.getElementById('user-avatar');
    const userNameEl = document.getElementById('user-name');
    const userCoinsEl = document.getElementById('user-coins');
    const statTotalTransactionsEl = document.getElementById('stat-total-transactions');
    const statTotalSalesEl = document.getElementById('stat-total-sales');
    const statMenungguEl = document.getElementById('stat-menunggu');
    const statDalamProsesEl = document.getElementById('stat-dalam-proses');
    const statBerhasilEl = document.getElementById('stat-berhasil');
    const statGagalEl = document.getElementById('stat-gagal');

    // Fungsi untuk mengambil dan merender data profil
    const fetchProfileData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                // Token tidak valid atau kadaluarsa
                localStorage.removeItem('token');
                alert('Sesi Anda telah berakhir. Silakan login kembali.');
                window.location.href = 'http://127.0.0.1:5500/frontend/user/login.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Gagal memuat data profil.');
            }

            const data = await response.json();
            renderProfile(data);

        } catch (error) {
            console.error('Error:', error);
            document.querySelector('.profile-page-container').innerHTML = `<p class="error">${error.message}</p>`;
        }
    };

    // Fungsi untuk menampilkan data ke HTML
    const renderProfile = (data) => {
        const { user, stats } = data;

        // Render info user
        userAvatarEl.textContent = user.name.charAt(0).toUpperCase();
        userNameEl.textContent = user.name;
        userCoinsEl.textContent = user.gampang_coins.toLocaleString('id-ID');

        // Render statistik
        statTotalTransactionsEl.textContent = stats.total_transactions;
        statTotalSalesEl.textContent = `Rp ${stats.total_sales.toLocaleString('id-ID')}`;
        statMenungguEl.textContent = stats.menunggu;
        statDalamProsesEl.textContent = stats.dalam_proses;
        statBerhasilEl.textContent = stats.berhasil;
        statGagalEl.textContent = stats.gagal;
    };

    // Panggil fungsi utama
    fetchProfileData();
});