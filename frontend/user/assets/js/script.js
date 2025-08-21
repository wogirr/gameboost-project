// ==================== KONSTANTA GLOBAL ====================
const PRODUCTS_PER_PAGE = 10;
const API = window.GampangTopupAPI; // Menggunakan API global

// Tambahkan di bagian atas file
const IMG_BASE_URL = 'http://localhost:5000'; 

// ==================== INISIALISASI UTAMA ====================
document.addEventListener('DOMContentLoaded', async () => {
  await loadSharedUI();

  // Inisialisasi komponen UI
  initHamburgerMenu();
  initSlider();
  initSearch();

  // Muat konten utama
  await initFlashSale();
  await initLatestArticles();
  await initCategories();
  await loadPopularProducts();
});

// ==================== KOMPONEN UI ====================

/**
 * Memuat komponen UI yang reusable seperti footer
 */
async function loadSharedUI() {
  // Load Footer
  try {
    const response = await fetch('footer.html');
    const footerHTML = await response.text();
    const placeholder = document.getElementById('footer-placeholder');
    if (placeholder) {
      placeholder.innerHTML = footerHTML;
    }
  } catch (error) {
    console.error('Failed to load footer:', error);
  }
}

/**
 * Inisialisasi hamburger menu untuk tampilan mobile
 */
function initHamburgerMenu() {
  const hamburger = document.querySelector('.hamburger-menu');
  const mainNav = document.querySelector('.main-nav');

  if (hamburger && mainNav) {
    hamburger.addEventListener('click', () => {
      mainNav.classList.toggle('active');
      hamburger.classList.toggle('active');
    });
  }
}

/**
 * Inisialisasi slider banner
 */
function initSlider() {
  const slider = document.querySelector('.slider');
  if (!slider) return;

  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.querySelector('.slider-btn.prev');
  const nextBtn = document.querySelector('.slider-btn.next');
  let currentIndex = 0;
  let autoSlideInterval;

  function goToSlide(index) {
    if (index < 0) index = slides.length - 1;
    else if (index >= slides.length) index = 0;

    slider.style.transform = `translateX(-${index * 100}%)`;
    currentIndex = index;
  }

  function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 5000);
  }

  function stopAutoSlide() {
    clearInterval(autoSlideInterval);
  }

  // Event listeners
  nextBtn.addEventListener('click', () => {
    goToSlide(currentIndex + 1);
    stopAutoSlide();
    startAutoSlide();
  });

  prevBtn.addEventListener('click', () => {
    goToSlide(currentIndex - 1);
    stopAutoSlide();
    startAutoSlide();
  });

  // Inisialisasi
  startAutoSlide();

  // Hentikan auto slide saat hover
  slider.addEventListener('mouseenter', stopAutoSlide);
  slider.addEventListener('mouseleave', startAutoSlide);
}

/**
 * Inisialisasi fungsi pencarian
 */
function initSearch() {
  const searchInput = document.getElementById('global-search');
  const searchBtn = document.getElementById('search-btn');

  const performSearch = async () => {
    const query = searchInput.value.trim();
    if (!query) {
      await loadPopularProducts();
      return;
    }

    try {
      const results = await API.searchProducts(query);
      renderSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      showError('Gagal melakukan pencarian');
    }
  };

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
}

// ==================== FLASH SALE ====================

/**
 * Inisialisasi komponen flash sale
 */
async function initFlashSale() {
  try {
    // Setup timer
    initFlashSaleTimer();

    // Muat item flash sale
    const items = await API.fetchFlashSaleItems();
    renderFlashSaleItems(items);
  } catch (error) {
    console.error('Flash sale error:', error);
    const flashSaleSection = document.querySelector('.flash-sale-section');
    if (flashSaleSection) flashSaleSection.style.display = 'none';
  }
}

/**
 * Timer countdown flash sale
 */
function initFlashSaleTimer() {
  const timerElement = document.getElementById('flash-sale-timer');
  if (!timerElement) return;

  const updateTimer = () => {
    const now = new Date();
    const endTime = new Date();
    endTime.setHours(23, 59, 59); // Berakhir pukul 23:59

    const diff = endTime - now;
    if (diff <= 0) {
      timerElement.textContent = "00:00:00";
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
    const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');

    timerElement.textContent = `${hours}:${minutes}:${seconds}`;
  };

  updateTimer();
  setInterval(updateTimer, 1000);
}

/**
 * Render item flash sale
 */
function renderFlashSaleItems(items) {
    const container = document.querySelector('.flash-sale-scroll');
    if (!container) return;
  
    if (!items || items.length === 0) {
      container.innerHTML = '<p class="no-items">Tidak ada item flash sale saat ini</p>';
      return;
    }
  
    container.innerHTML = items.map(item => {
      // Tentukan URL gambar, gunakan default jika tidak ada
      const imageUrl = item.icon_url ? `${IMG_BASE_URL}${item.icon_url}` : `${IMG_BASE_URL}/images/default-item.png`;
      
      return `
        <a href="topup.html?product_id=${item.product_id}" class="flash-item">
          <img src="${imageUrl}"
               alt="${item.name}" 
               class="flash-item-image"
               onerror="this.onerror=null;this.src='${IMG_BASE_URL}/images/default-item.png';">
          <div class="flash-item-content">
            <div class="flash-item-title">${item.name}</div>
            <div class="flash-item-title">${item.product_name}</div>
            <div class="flash-item-price">Rp ${parseInt(item.selling_price).toLocaleString('id-ID')}</div>
            <div class="flash-item-original-price">Rp ${parseInt(item.base_price).toLocaleString('id-ID')}</div>
          </div>
        </a>
      `;
    }).join('');
}

// ==================== ARTIKEL TERBARU ====================

/**
 * Inisialisasi komponen artikel terbaru
 */
async function initLatestArticles() {
  try {
    const articles = await API.fetchLatestArticles(3); // Ambil 3 artikel terbaru
    renderLatestArticles(articles);
  } catch (error) {
    console.error('Latest articles error:', error);
    // Sembunyikan section jika gagal
    const articleSection = document.querySelector('.latest-articles-section');
    if (articleSection) articleSection.style.display = 'none';
  }
}

/**
 * Render kartu artikel terbaru
 */
function renderLatestArticles(articles) {
  const grid = document.getElementById('latest-articles-grid');
  if (!grid) return;

  if (!articles || articles.length === 0) {
    grid.innerHTML = '<p>Belum ada artikel terbaru.</p>';
    return;
  }

  grid.innerHTML = articles.map(article => {
    const imageUrl = article.thumbnail_url ? `${IMG_BASE_URL}${article.thumbnail_url}` : `${IMG_BASE_URL}/images/default-article.png`;
    const defaultImage = `${IMG_BASE_URL}/images/default-article.png`;
    
    // Asumsi backend memberikan 'author_name'
    const author = article.author_name || 'Redaksi'; 

    return `
      <a href="artikel-detail.html?slug=${article.slug}" class="article-card">
        <img src="${imageUrl}" alt="${article.title}" class="article-card-image" onerror="this.onerror=null;this.src='${defaultImage}';">
        <div class="article-card-content">
          <h3>${article.title}</h3>
          <p class="article-card-author">Oleh: ${author}</p>
        </div>
      </a>
    `;
  }).join('');
}

// ==================== KATEGORI & PRODUK ====================

/**
 * Inisialisasi tab kategori
 */
async function initCategories() {
  try {
    const categories = await API.fetchCategories();
    renderCategoryTabs(categories);
  } catch (error) {
    console.error('Categories error:', error);
    const tabsContainer = document.getElementById('category-tabs-container');
    if (tabsContainer) {
      tabsContainer.innerHTML = '<p class="error">Gagal memuat kategori</p>';
    }
  }
}

/**
 * Render tab kategori
 */
function renderCategoryTabs(categories) {
  const tabsContainer = document.getElementById('category-tabs-container');
  if (!tabsContainer) return;

  // Tab Populer (default)
  tabsContainer.innerHTML = `
    <button class="category-tab active" data-category-type="popular">
      <i class="fas fa-fire"></i> Populer
    </button>
  `;

  // Tab kategori dari database
  categories.forEach(category => {
    const tab = document.createElement('button');
    tab.className = 'category-tab';
    tab.dataset.categoryId = category.id;
    tab.innerHTML = `<i class="${category.icon_class}"></i> ${category.name}`;
    
    tab.addEventListener('click', async () => {
      // Update UI
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Muat produk
      await loadProductsByCategory(category.id);
    });
    
    tabsContainer.appendChild(tab);
  });
}

/**
 * Memuat produk populer
 */
async function loadPopularProducts() {
  try {
    const products = await API.fetchPopularProducts();
    renderProducts(products, "Populer");
  } catch (error) {
    console.error('Popular products error:', error);
    showError('Gagal memuat produk populer');
  }
}

/**
 * Memuat produk berdasarkan kategori
 */
async function loadProductsByCategory(categoryId) {
  try {
    const products = await API.fetchProductsByCategory(categoryId);
    const categoryName = products.length > 0 ? products[0].category_name : 'Produk';
    renderProducts(products, categoryName);
  } catch (error) {
    console.error('Category products error:', error);
    showError('Gagal memuat produk');
  }
}

/**
 * Render daftar produk
 */
function renderProducts(products, title) {
    const wrapper = document.getElementById('product-content-wrapper');
    if (!wrapper) return;
  
    if (!products || products.length === 0) {
      wrapper.innerHTML = `<p class="no-products">Tidak ada produk di kategori "${title}"</p>`;
      return;
    }
  
    // Fungsi untuk membuat HTML satu kartu game
    const createGameCard = (product) => {
      const imageUrl = product.logo_url ? `${IMG_BASE_URL}${product.logo_url}` : `${IMG_BASE_URL}/images/default-game.png`;
      const defaultImage = `${IMG_BASE_URL}/images/default-game.png`;
  
      return `
        <a href="topup.html?product_id=${product.id}" class="game-card">
          <img src="${imageUrl}"
               alt="${product.name}"
               onerror="this.onerror=null;this.src='${defaultImage}';">
          <p>${product.name}</p>
        </a>
      `;
    };
  
    const visibleProducts = products.slice(0, PRODUCTS_PER_PAGE);
    const hiddenProducts = products.slice(PRODUCTS_PER_PAGE);
  
    wrapper.innerHTML = `
      <section class="category-content active">
        <h2 class="section-title">${title}</h2>
        <div class="game-grid" id="products-grid">
          ${visibleProducts.map(createGameCard).join('')}
        </div>
        ${hiddenProducts.length > 0 ? `
          <button class="show-more-btn" data-hidden-count="${hiddenProducts.length}">
            Tampilkan Lebih Banyak (${hiddenProducts.length}+)
          </button>
        ` : ''}
      </section>
    `;
  
    const showMoreBtn = wrapper.querySelector('.show-more-btn');
    if (showMoreBtn) {
      showMoreBtn.addEventListener('click', () => {
        const grid = wrapper.querySelector('#products-grid');
        if (!grid) return;
  
        grid.innerHTML += hiddenProducts.map(createGameCard).join('');
        showMoreBtn.remove();
      });
    }
  }

// ==================== PENCARIAN ====================

/**
 * Render hasil pencarian
 */
function renderSearchResults(products) {
    const wrapper = document.getElementById('product-content-wrapper');
    if (!wrapper) return;
  
    if (!products || products.length === 0) {
      wrapper.innerHTML = '<p class="no-results">Tidak ditemukan produk yang cocok</p>';
      return;
    }
  
    wrapper.innerHTML = `
      <section class="category-content active">
        <h2 class="section-title">Hasil Pencarian</h2>
        <div class="game-grid">
          ${products.map(product => {
            const imageUrl = product.logo_url ? `${IMG_BASE_URL}${product.logo_url}` : `${IMG_BASE_URL}/images/default-game.png`;
            const defaultImage = `${IMG_BASE_URL}/images/default-game.png`;
            
            return `
              <a href="topup.html?product_id=${product.id}" class="game-card">
                <img src="${imageUrl}"
                     alt="${product.name}"
                     onerror="this.onerror=null;this.src='${defaultImage}';">
                <p>${product.name}</p>
              </a>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

// ==================== UTILITAS ====================

/**
 * Menampilkan pesan error
 */
function showError(message) {
  const wrapper = document.getElementById('product-content-wrapper');
  if (wrapper) {
    wrapper.innerHTML = `<p class="error">${message}</p>`;
  }
}
