// KODE PERBAIKAN: Isi baru untuk file topup.js

document.addEventListener('DOMContentLoaded', () => {
    // === STATE MANAGEMENT ===
    let orderState = {
        productId: null,
        productDetails: null,
        selectedItem: null,
        playerData: {
            id: null,
            zone: null,
            server: null,
            raw: null
        }, 
        contactEmail: '',
        contactWhatsapp: '' // <-- Tambahkan properti whatsapp
    };

    // === KONSTANTA & ELEMENT UI ===
    const API_BASE_URL = 'http://localhost:5000/api';
    const IMG_BASE_URL = 'http://localhost:5000';

    const getOrSetDeviceID = () => {
        let deviceID = localStorage.getItem('userDeviceID');
        if (!deviceID) {
            deviceID = 'guest-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('userDeviceID', deviceID);
        }
        return deviceID;
    };

    const bannerImgEl = document.querySelector('.game-banner-img');
    const logoImgEl = document.querySelector('.game-logo-img');
    const productTitleEl = document.getElementById('product-title');
    const productDescriptionEl = document.getElementById('product-description');
    const playerInputSectionEl = document.getElementById('player-input-section');
    const nominalItemsContainerEl = document.getElementById('nominal-items-container');
    const checkoutButton = document.getElementById('checkout-button');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalSummaryEl = document.getElementById('modal-order-summary');
    const payNowBtn = document.getElementById('pay-now-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const contactEmailEl = document.getElementById('contact-email');
    const contactWhatsappEl = document.getElementById('contact-whatsapp');
    
    // === FUNGSI UTAMA (INITIALIZATION) ===
    const init = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('product_id');

        if (!productId) {
            document.querySelector('.topup-page-container').innerHTML = '<p class="error">Produk tidak ditemukan. Silakan kembali ke halaman utama.</p>';
            return;
        }
        orderState.productId = productId;

        setupEventListeners();

        try {
            const productData = await fetchProductDetails(productId);
            orderState.productDetails = productData;
            renderPage(productData);
        } catch (error) {
            console.error('Initialization failed:', error);
            document.querySelector('.topup-page-container').innerHTML = `<p class="error">Gagal memuat detail produk: ${error.message}</p>`;
        }
    };

    const fetchProductDetails = async (productId) => {
        const response = await fetch(`${API_BASE_URL}/game/products/${productId}`);
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to fetch data');
        }
        return response.json();
    };

    // === FUNGSI RENDER ===
    const renderPage = (product) => {
        document.title = `Top Up ${product.name} - GAMPANGTOPUP`;
        renderProductHeader(product);
        renderPlayerInput(product);
        renderNominalItems(product.item_groups);
    };

    const renderProductHeader = (product) => {
        bannerImgEl.src = product.banner_url ? `${IMG_BASE_URL}${product.banner_url}` : 'https://placehold.co/800x200/1a1a1a/fbc02d?text=Banner';
        bannerImgEl.alt = `${product.name} Banner`;
        logoImgEl.src = product.logo_url ? `${IMG_BASE_URL}${product.logo_url}` : 'https://placehold.co/100x100/2c2c2c/ffffff?text=Logo';
        logoImgEl.alt = `${product.name} Logo`;
        productTitleEl.textContent = product.name;
        productDescriptionEl.innerHTML = product.description || '';
    };

    const renderPlayerInput = (product) => {
        let inputHTML = '';
        switch (product.input_type) {
            case 'id_zone':
                inputHTML = `<div class="form-group"><input type="text" id="player-id-raw" class="form-control" placeholder="Masukkan User ID (Zone ID)"><small class="input-hint">Contoh: 12345678(9101). Wajib diisi.</small></div>`;
                break;
            case 'id_server':
                const serverOptionsHTML = (product.server_options || [])
                    .map(server => `<option value="${server.value}">${server.name}</option>`)
                    .join('');
                inputHTML = `<div class="form-group-inline"><input type="text" id="player-id-raw" class="form-control" placeholder="Masukkan User ID"><select id="player-server-raw" class="form-control"><option value="">Pilih Server</option>${serverOptionsHTML}</select></div><small class="input-hint">Wajib diisi.</small>`;
                break;
            default:
                inputHTML = `<div class="form-group"><input type="text" id="player-id-raw" class="form-control" placeholder="Masukkan Player ID"><small class="input-hint">Wajib diisi.</small></div>`;
                break;
        }
        playerInputSectionEl.innerHTML = inputHTML;
        
        document.getElementById('player-id-raw').addEventListener('input', updateCheckoutButtonState);
        if (document.getElementById('player-server-raw')) {
            document.getElementById('player-server-raw').addEventListener('change', updateCheckoutButtonState);
        }
    };

    const renderNominalItems = (itemGroups) => {
        if (!itemGroups || itemGroups.length === 0) {
            nominalItemsContainerEl.innerHTML = '<p>Tidak ada item yang tersedia untuk produk ini.</p>';
            return;
        }
        let flashSaleItemsHTML = '';
        let regularItemsHTML = '';
        const allFlashSaleItems = [];
        const regularGroups = itemGroups.map(group => {
            const fsItems = group.items.filter(item => item.flash_sale);
            const regItems = group.items.filter(item => !item.flash_sale);
            allFlashSaleItems.push(...fsItems);
            return { ...group, items: regItems };
        }).filter(group => group.items.length > 0);

        if (allFlashSaleItems.length > 0) {
            flashSaleItemsHTML = `<div class="item-group"><h4 class="item-group-title flash-sale"><i class="fas fa-bolt"></i> Flash Sale</h4><div class="nominal-grid">${allFlashSaleItems.map(createItemHTML).join('')}</div></div>`;
        }

        regularItemsHTML = regularGroups.map(group => `<div class="item-group"><h4 class="item-group-title"><i class="fas fa-gem"></i> ${group.name}</h4><div class="nominal-grid">${group.items.map(createItemHTML).join('')}</div></div>`).join('');
        
        nominalItemsContainerEl.innerHTML = flashSaleItemsHTML + regularItemsHTML;
    };

    const createItemHTML = (item) => {
        const discountPercentage = item.discount_percentage || 0;
        const hasDiscount = discountPercentage > 0;
        const originalPrice = item.base_price;

        return `
            <div class="nominal-item" data-item-id="${item.id}">
                ${hasDiscount ? `<div class="item-tag discount">Disc ${discountPercentage}%</div>` : ''}
                <div class="item-main-content">
                    ${item.icon_url ? `<img src="${IMG_BASE_URL}${item.icon_url}" alt="${item.name}" class="item-icon">` : '<div class="item-icon-placeholder"><i class="fas fa-gem"></i></div>' }
                    <div class="item-details">
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">Rp ${item.selling_price.toLocaleString('id-ID')}</div>
                        ${hasDiscount ? `<div class="item-original-price">Rp ${originalPrice.toLocaleString('id-ID')}</div>` : ''}
                    </div>
                </div>
                <div class="item-footer">
                    ${item.flash_sale ? `<div class="item-stock">Terbatas!</div>` : '<div></div>'}
                    <div class="item-tag instant">NORMAL</div>
                </div>
            </div>`;
    };

    // === FUNGSI EVENT HANDLING ===
    const setupEventListeners = () => {
        nominalItemsContainerEl.addEventListener('click', handleItemSelection);
        checkoutButton.addEventListener('click', handleCheckout);
        closeModalBtn.addEventListener('click', () => confirmationModal.classList.remove('show'));
        payNowBtn.addEventListener('click', handlePayment);
    };

    const handleItemSelection = (e) => {
        const selectedEl = e.target.closest('.nominal-item');
        if (!selectedEl) return;

        document.querySelectorAll('.nominal-item').forEach(el => el.classList.remove('active'));
        selectedEl.classList.add('active');

        const itemId = selectedEl.dataset.itemId;
        for (const group of orderState.productDetails.item_groups) {
            const foundItem = group.items.find(item => item.id == itemId);
            if (foundItem) {
                orderState.selectedItem = foundItem;
                break;
            }
        }
        updateCheckoutButtonState();
    };
    
    const isPlayerInputValid = () => {
        const playerIdRawEl = document.getElementById('player-id-raw');
        if (!playerIdRawEl || !playerIdRawEl.value.trim()) return false;
        const playerServerRawEl = document.getElementById('player-server-raw');
        if (playerServerRawEl && !playerServerRawEl.value) return false;
        return true;
    }

    const updateCheckoutButtonState = () => {
        checkoutButton.disabled = !(isPlayerInputValid() && orderState.selectedItem);
    };

    const handleCheckout = () => {
        if (!isPlayerInputValid() || !orderState.selectedItem) {
            alert('Harap lengkapi Data Akun dan pilih salah satu Nominal Top Up.');
            return;
        }

        const playerIdRawEl = document.getElementById('player-id-raw');
        const playerServerRawEl = document.getElementById('player-server-raw');

        orderState.playerData.raw = playerIdRawEl.value.trim();
        orderState.playerData.server = playerServerRawEl ? playerServerRawEl.value : null;
        orderState.contactEmail = contactEmailEl.value.trim();
        orderState.contactWhatsapp = contactWhatsappEl.value.trim();

        renderConfirmationModal();
        confirmationModal.classList.add('show');
    };
    
    const renderConfirmationModal = () => {
        let playerDisplay = orderState.playerData.raw;
        if (orderState.playerData.server && orderState.productDetails.server_options) {
            const server = orderState.productDetails.server_options.find(s => s.value === orderState.playerData.server);
            if (server) playerDisplay += ` (${server.name})`;
        }

        modalSummaryEl.innerHTML = `
            <div class="summary-item"><span>Game:</span> <span>${orderState.productDetails.name}</span></div>
            <div class="summary-item"><span>Player ID:</span> <span>${playerDisplay}</span></div>
            <div class="summary-item"><span>Item:</span> <span>${orderState.selectedItem.name}</span></div>
            ${orderState.contactEmail ? `<div class="summary-item"><span>Email:</span> <span>${orderState.contactEmail}</span></div>` : ''}
            ${orderState.contactWhatsapp ? `<div class="summary-item"><span>No. WhatsApp:</span> <span>${orderState.contactWhatsapp}</span></div>` : ''}
            <div class="summary-item total"><span>Total Bayar:</span> <strong>Rp ${orderState.selectedItem.selling_price.toLocaleString('id-ID')}</strong></div>
        `;
    };

    const handlePayment = async () => {
        payNowBtn.disabled = true;
        payNowBtn.textContent = 'Memproses...';
        try {
            const token = localStorage.getItem('authToken');
            const transactionData = { ...orderState, deviceID: getOrSetDeviceID() };
            const response = await fetch(`${API_BASE_URL}/transactions/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: JSON.stringify(transactionData)
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `Gagal membuat transaksi. Status: ${response.status}`);
            }
            const data = await response.json();
            if (!data.snapToken) throw new Error('Gagal mendapatkan token pembayaran dari server.');
            
            snap.pay(data.snapToken, {
                onSuccess: (result) => { window.location.href = 'http://127.0.0.1:5500/frontend/user/riwayat.html'; },
                onPending: (result) => { window.location.href = 'http://127.0.0.1:5500/frontend/user/riwayat.html'; },
                onError: (result) => { alert("Pembayaran gagal!"); },
                onClose: () => { console.log('Popup pembayaran ditutup.'); }
            });
        } catch (error) {
            alert(`Terjadi kesalahan: ${error.message}`);
        } finally {
            payNowBtn.disabled = false;
            payNowBtn.textContent = 'Bayar Sekarang';
        }
    };

    // Mulai aplikasi
    init();
});