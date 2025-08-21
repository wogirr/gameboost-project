document.addEventListener('DOMContentLoaded', () => {

    const API_BASE_URL = 'http://localhost:5000/api';
    const historyContainer = document.getElementById('history-container');
    const detailModal = document.getElementById('detail-modal');
    const modalDetailsContent = document.getElementById('modal-details-content');
    const closeModalBtn = document.getElementById('close-modal-btn');

    let transactionsData = [];

    const init = async () => {
        const token = localStorage.getItem('gampang-topup-token');
        const deviceID = token ? null : localStorage.getItem('userDeviceID');

        // if (!token && !deviceID) {
        //     historyContainer.innerHTML = '<p class="info-text">Tidak ada riwayat transaksi yang bisa ditampilkan.</p>';
        //     return;
        // }

        try {
            const transactions = await fetchHistory(token, deviceID);
            transactionsData = transactions;
            renderHistory(transactions);
        } catch (error) {
            historyContainer.innerHTML = `<p class="error-text">Gagal memuat riwayat: ${error.message}</p>`;
        }
    };

    const fetchHistory = async (token, deviceID) => {
        let url = `${API_BASE_URL}/transactions/history`;
        const headers = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else if (deviceID) {
            url += `?deviceID=${encodeURIComponent(deviceID)}`;
        }
        
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error('Gagal mengambil data dari server.');
        }
        return response.json();
    };

    // ... (Sisa fungsi renderHistory, createHistoryItemHTML, renderModalDetails, dan event listener tetap sama persis seperti sebelumnya) ...
    const renderHistory = (transactions) => {
        if (transactions.length === 0) {
            historyContainer.innerHTML = '<p class="info-text">Anda belum memiliki riwayat transaksi.</p>';
            return;
        }
        historyContainer.innerHTML = transactions.map(trx => createHistoryItemHTML(trx)).join('');
    };
    const createHistoryItemHTML = (trx) => {
        const statusClass = (trx.status || 'pending').toLowerCase();
        const statusText = trx.status.charAt(0).toUpperCase() + trx.status.slice(1).toLowerCase();
        return `
            <div class="history-item" data-id="${trx.id}">
                <div class="history-item-details">
                    <p class="item-title">${trx.product_name} - ${trx.item_name}</p>
                    <p class="item-invoice">${trx.invoice_number}</p>
                </div>
                <div class="history-item-status">
                    <p class="item-price">Rp ${trx.total_price.toLocaleString('id-ID')}</p>
                    <p class="item-status ${statusClass}">● ${statusText}</p>
                </div>
            </div>
        `;
    };
    // Fungsi renderModalDetails yang diperbarui
    const renderModalDetails = (trx) => {
        const transactionDate = new Date(trx.transaction_date).toLocaleString('id-ID', {
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        let playerInfo = trx.player_id;
        if (trx.player_zone) playerInfo += ` (${trx.player_zone})`;
        if (trx.player_server) playerInfo += ` [${trx.player_server}]`;
        
        // Format status dengan ikon
        let statusIcon = '';
        let statusClass = trx.status.toLowerCase();
        
        switch(statusClass) {
            case 'success':
                statusIcon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'pending':
                statusIcon = '<i class="fas fa-clock"></i>';
                break;
            case 'failed':
                statusIcon = '<i class="fas fa-times-circle"></i>';
                break;
            default:
                statusIcon = '<i class="fas fa-info-circle"></i>';
        }
        
        modalDetailsContent.innerHTML = `
            <div class="summary-item">
                <span>Nomor Invoice</span>
                <strong>${trx.invoice_number}</strong>
            </div>
            <div class="summary-item">
                <span>Tanggal Transaksi</span>
                <span>${transactionDate}</span>
            </div>
            <div class="summary-item">
                <span>Produk</span>
                <span>${trx.product_name}</span>
            </div>
            <div class="summary-item">
                <span>Item</span>
                <span>${trx.item_name}</span>
            </div>
            <div class="summary-item">
                <span>Data Akun</span>
                <span>${playerInfo}</span>
            </div>
            <div class="summary-item">
                <span>Metode Pembayaran</span>
                <span>${trx.payment_method}</span>
            </div>
            <div class="summary-item">
                <span>Status</span>
                <span class="item-status ${statusClass}">
                    ${statusIcon} ${trx.status}
                </span>
            </div>
            <div class="summary-item total">
                <span>Total Pembayaran</span>
                <strong>Rp ${trx.total_price.toLocaleString('id-ID')}</strong>
            </div>
            
            <div class="cs-buttons">
                <a href="https://wa.me/6281234567890?text=Halo%20CS%20GampangTopup,%20saya%20membutuhkan%20bantuan%20untuk%20transaksi%20${trx.invoice_number}" 
                target="_blank" 
                class="btn-cs whatsapp">
                    <i class="fab fa-whatsapp"></i> Bantuan via WhatsApp
                </a>
                <a href="https://t.me/GampangTopupCS?text=Halo%20CS,%20saya%20membutuhkan%20bantuan%20untuk%20transaksi%20${trx.invoice_number}" 
                target="_blank" 
                class="btn-cs telegram">
                    <i class="fab fa-telegram-plane"></i> Bantuan via Telegram
                </a>
            </div>
        `;
    };

    // Event listener untuk tombol close (tambahkan ini jika belum ada)
    closeModalBtn.addEventListener('click', () => {
        detailModal.classList.remove('show');
        document.body.style.overflow = 'auto'; // Mengembalikan scroll
    });

    // Event listener untuk klik di luar modal (tambahkan ini jika belum ada)
    detailModal.addEventListener('click', (e) => {
        if (e.target === detailModal) {
            detailModal.classList.remove('show');
            document.body.style.overflow = 'auto'; // Mengembalikan scroll
        }
    });

    // Tambahkan ini di fungsi handleHistoryItemClick sebelum menampilkan modal
    const handleHistoryItemClick = (event) => {
        const item = event.target.closest('.history-item');
        if (!item) return;
        
        const transactionId = item.dataset.id;
        const transactionData = transactionsData.find(trx => trx.id == transactionId);
        
        if (transactionData) {
            renderModalDetails(transactionData);
            detailModal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Mencegah scroll di background
        }
    };

    historyContainer.addEventListener('click', handleHistoryItemClick);
    closeModalBtn.addEventListener('click', () => detailModal.classList.remove('show'));
    detailModal.addEventListener('click', (event) => {
        if (event.target === detailModal) {
            detailModal.classList.remove('show');
        }
    });

    init();
});
