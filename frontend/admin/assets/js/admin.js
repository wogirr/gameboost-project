// admin.js - JavaScript untuk SPA Admin Dashboard

// ======================================================
// 1. GLOBAL VARIABLES
// ======================================================
let currentPage = 'dashboard';
let editingCategoryId = null; // Untuk menyimpan ID kategori yang sedang diedit
let editingProductId = null;
let currentTransactionView = 'all'; // 'all' atau 'problem'

// MODIFIKASI: Ganti variabel state yang spesifik untuk user
// dengan sebuah objek state generik untuk tabel.
let tableState = {
  currentPage: 1,
  itemsPerPage: 10,
  searchQuery: '',
  filterRole: 'all',    // Ini tetap bisa spesifik jika hanya untuk user
  filterStatus: 'all',  // Ini tetap bisa spesifik jika hanya untuk user
  filterCategory: 'all', // BARU: Tambahkan untuk filter kategori
  filterProduct: 'all',
  filterItemGroup: 'all',
  totalPages: 1,
  endpoint: '',
  renderFunction: null,
  containerId: ''
};

// ======================================================
// 2. INITIALIZATION & AUTHENTICATION
// ======================================================

// Initialize the application
function init() {
  checkAuth(); // Memeriksa autentikasi saat aplikasi dimulai
  setupGlobalEventListeners(); // Menyiapkan event listener global (navigasi, logout)
  loadPage(window.location.hash.substring(1) || 'dashboard'); // Memuat halaman awal berdasarkan hash URL atau default ke dashboard
}

// Check if user is authenticated
function checkAuth() {
  const token = localStorage.getItem('adminToken'); // Mendapatkan token dari localStorage
  const isLoginPage = window.location.pathname.includes('login.html'); // Memeriksa apakah halaman saat ini adalah halaman login

  if (!token && !isLoginPage) { // Jika tidak ada token dan bukan halaman login, redirect ke login
    window.location.href = 'login.html';
  } else if (token && isLoginPage) { // Jika ada token dan di halaman login, redirect ke index
    window.location.href = 'index.html';
  }
}

// ======================================================
// 3. GLOBAL EVENT LISTENERS & NAVIGATION
// ======================================================

// BARU: Fungsi generik untuk membuat HTML modal filter
function createGenericFilterModalHTML() {
  return `
    <div id="filterModal" class="modal filter-modal" style="display: none;">
      <div class="modal-content filter-modal-content">
        <span class="close-btn" id="closeFilterModalBtn">&times;</span>
        <h3 class="modal-title">Filter Options</h3>
        <div id="filterOptionsContainer" class="form-grid">
          </div>
        <div class="form-actions filter-actions">
          <button type="button" class="btn btn-secondary" id="resetFilterBtn">Reset Filter</button>
          <button type="button" class="btn btn-primary" id="applyFilterBtn">Apply Filter</button>
        </div>
      </div>
    </div>
  `;
}

// Setup global event listeners (e.g., navigation, logout)
function setupGlobalEventListeners() {
  // Navigation links
  document.querySelectorAll('.nav-links a').forEach(link => { // Menambahkan event listener untuk setiap link navigasi
    link.addEventListener('click', (e) => {
      e.preventDefault(); // Mencegah perilaku default link
      const page = e.target.getAttribute('href').substring(1); // Mendapatkan nama halaman dari atribut href
      loadPage(page); // Memuat halaman yang sesuai
    });
  });

  // Logout button
  document.getElementById('logoutBtn')?.addEventListener('click', logout); // Menambahkan event listener untuk tombol logout
}

// Logout function
function logout() {
  localStorage.removeItem('adminToken'); // Menghapus token dari localStorage
  window.location.href = 'login.html'; // Redirect ke halaman login
}

// Load page content dynamically
function loadPage(page) {
  currentPage = page; // Memperbarui halaman saat ini
  window.location.hash = page; // Memperbarui hash URL
  updateActiveLink(); // Memperbarui link navigasi aktif
  updatePageTitle(); // Memperbarui judul halaman
  loadPageContent(); // Memuat konten halaman
}

// Update active link in sidebar
function updateActiveLink() {
  document.querySelectorAll('.nav-links a').forEach(link => { // Menghapus kelas 'active' dari semua link
    link.classList.remove('active');
    if (link.getAttribute('href').substring(1) === currentPage) { // Menambahkan kelas 'active' ke link halaman saat ini
      link.classList.add('active');
    }
  });
}

// Update page title
function updatePageTitle() {
  const pageTitles = { // Objek untuk menyimpan judul halaman
    dashboard: 'Dashboard',
    categories: 'Categories',
    products: 'Products',
    items: 'Product Items',
    payments: 'Payment Methods',
    transactions: 'Transactions',
    articles: 'Articles'
  };

  const title = pageTitles[currentPage] || 'Dashboard'; // Mendapatkan judul berdasarkan halaman saat ini
  document.getElementById('pageTitle').textContent = title; // Memperbarui teks judul halaman
}

// Load page content into contentArea
function loadPageContent() {
    // BARU: Reset state tabel setiap kali pindah halaman
  resetTableState();

  const contentArea = document.getElementById('contentArea'); // Mendapatkan elemen area konten

  // Clear previous event listeners to prevent duplicates, if necessary
  // (More robust SPA frameworks handle this automatically)
  // For simpler HTML/JS SPA, sometimes manual cleanup or re-attaching is needed.
  // Here, we rely on `setupCategoriesEvents()` being called after content is loaded.

  // BARU: Pastikan modal filter generik ada di DOM
  // Masukkan di luar contentArea agar tidak terhapus saat contentArea di-update
  let existingFilterModal = document.getElementById('filterModal');
  if (!existingFilterModal) {
    // Sisipkan modal filter di body atau parent dari contentArea
    // Misalnya, di akhir body atau elemen container utama aplikasi
    // Untuk contoh ini, kita asumsikan bisa disisipkan setelah contentArea
    contentArea.insertAdjacentHTML('afterend', createGenericFilterModalHTML());
  }
  // Sembunyikan modal setiap kali halaman dimuat ulang
  document.getElementById('filterModal').style.display = 'none';

  switch(currentPage) { // Memuat konten berdasarkan halaman saat ini
    case 'dashboard':
      loadDashboardContent(contentArea);
      break;
    case 'categories':
      loadCategoriesContent(contentArea);
      break;
    case 'products':
      loadProductsContent(contentArea);
      break;
    case 'group':
      loadItemGroupsContent(contentArea);
      break;
    case 'items':
      loadProductItemsContent(contentArea);
      break;
    case 'payments':
      // loadPaymentsContent(contentArea); // Masih placeholder
      contentArea.innerHTML = '<h2>Payment Methods Page (Coming Soon)</h2>';
      break;
    case 'transactions':
      loadTransactionsContent(contentArea);
      break;
    case 'users': 
      loadUsersContent(contentArea); 
      break;
    case 'articles': // <-- TAMBAHKAN CASE BARU INI
      loadArticlesContent(contentArea);
      break;
    default:
      loadDashboardContent(contentArea);
  }
}

// BARU: Fungsi untuk mereset state tabel
function resetTableState() {
  tableState = {
    currentPage: 1,
    itemsPerPage: 10,
    searchQuery: '',
    filterRole: 'all',
    filterStatus: 'all',
    filterCategory: 'all',
    filterProduct: 'all',
    filterItemGroup: 'all',
    totalPages: 1,
    endpoint: '',
    renderFunction: null,
    containerId: ''
  };
}

// BARU: Fungsi generik untuk membuat HTML toolbar
function createToolbarHTML(pageTitle) {
  // Untuk halaman transaksi, kita tidak perlu filter button di sini
  const filterButtonHTML = pageTitle !== 'Transactions' ? `
      <button id="filterBtn" class="btn filter-btn-primary">
        <i class="fas fa-filter"></i> Filter
      </button>
  ` : '';

  return `
      <div class="table-toolbar">
          <div class="data-options-left">
              <label for="entriesPerPage">Show</label>
              <select id="entriesPerPage" class="form-control-sm">
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
              </select>
              <span>entries</span>
          </div>
          <div class="data-options-right">
              <div class="search-box">
                  <input type="text" id="searchInput" placeholder="Search...">
                  <i class="fas fa-search search-icon"></i>
              </div>
              ${filterButtonHTML}
          </div>
      </div>
  `;
}

// BARU: Fungsi generik untuk membuat HTML pagination
function createPaginationHTML() {
  return `
      <div class="pagination-controls">
          <button id="prevPageBtn" class="btn-pagination" disabled><i class="fas fa-chevron-left"></i> Prev</button>
          <div id="pageNumbers" class="page-numbers"></div>
          <button id="nextPageBtn" class="btn-pagination" disabled>Next <i class="fas fa-chevron-right"></i></button>
      </div>
  `;
}

// ======================================================
// 4. DASHBOARD FUNCTIONS
// ======================================================

// Load dashboard content HTML structure
function loadDashboardContent(container) {
  container.innerHTML = `
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-exchange-alt"></i>
        </div>
        <div class="stat-value" id="totalTransactions">0</div>
        <div class="stat-label">Total Transactions</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-money-bill-wave"></i>
        </div>
        <div class="stat-value" id="todayIncome">Rp 0</div>
        <div class="stat-label">Today's Income</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-chart-line"></i>
        </div>
        <div class="stat-value" id="dailyProfit">Rp 0</div>
        <div class="stat-label">Daily Profit</div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-value" id="problemTransactions">0</div>
        <div class="stat-label">Problem Transactions</div>
      </div>
    </div>

    <div class="dashboard-sections">
        <div class="section-card chart-card">
            <h3 class="section-title">Monthly Transaction Statistics</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th>Total Transactions</th>
                            <th>Total Income</th>
                        </tr>
                    </thead>
                    <tbody id="monthlyStatsTable">
                        </tbody>
                </table>
            </div>
        </div>

        <div class="section-card table-card">
            <h3 class="section-title">Top 5 Users by Balance</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Username</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody id="topUsersTable">
                        </tbody>
                </table>
            </div>
        </div>

        <div class="section-card table-card">
            <h3 class="section-title">Top 5 Categories by Transactions</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Category</th>
                            <th>Transactions</th>
                        </tr>
                    </thead>
                    <tbody id="topCategoriesTable">
                        </tbody>
                </table>
            </div>
        </div>

        <div class="section-card table-card">
            <h3 class="section-title">Top 5 Products by Sales</h3>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Product</th>
                            <th>Sales Count</th>
                        </tr>
                    </thead>
                    <tbody id="topProductsTable">
                        </tbody>
                </table>
            </div>
        </div>
    </div>
  `;

  loadDashboardStats(); // Memuat statistik dashboard setelah HTML dimuat
}

// Fetch and load dashboard statistics
async function loadDashboardStats() {
  try {
    const token = localStorage.getItem('adminToken'); // Mendapatkan token admin
    const response = await fetch('http://localhost:5000/api/admin/dashboard', { // Mengambil data statistik dari API
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to fetch stats'); // Menangani error jika respons tidak OK

    const stats = await response.json(); // Menguraikan respons JSON

    // Memperbarui elemen HTML dengan data statistik
    document.getElementById('totalTransactions').textContent = stats.totalTransactions || 0;
    document.getElementById('todayIncome').textContent = `Rp ${stats.todayIncome?.toLocaleString() || 0}`;
    document.getElementById('dailyProfit').textContent = `Rp ${stats.dailyProfit?.toLocaleString() || 0}`; // Ganti 'activeProducts'
    document.getElementById('problemTransactions').textContent = stats.problemTransactions || 0;

    // Render Monthly Stats
    const monthlyStatsTable = document.getElementById('monthlyStatsTable');
    monthlyStatsTable.innerHTML = '';
    stats.monthlyStats?.forEach(data => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${data.month}</td>
        <td>${data.totalTransactions}</td>
        <td>Rp ${data.totalIncome?.toLocaleString() || 0}</td>
      `;
      monthlyStatsTable.appendChild(row);
    });

    // Render Top Users by Balance
    const topUsersTable = document.getElementById('topUsersTable');
    topUsersTable.innerHTML = '';
    stats.topUsers?.forEach((user, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${user.username}</td>
        <td>Rp ${user.balance?.toLocaleString() || 0}</td>
      `;
      topUsersTable.appendChild(row);
    });

    // Render Top Categories by Transactions
    const topCategoriesTable = document.getElementById('topCategoriesTable');
    topCategoriesTable.innerHTML = '';
    stats.topCategories?.forEach((category, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${category.name}</td>
        <td>${category.transactionCount}</td>
      `;
      topCategoriesTable.appendChild(row);
    });

    // Render Top Products by Sales
    const topProductsTable = document.getElementById('topProductsTable');
    topProductsTable.innerHTML = '';
    stats.topProducts?.forEach((product, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${product.name}</td>
        <td>${product.salesCount}</td>
      `;
      topProductsTable.appendChild(row);
    });

  } catch (err) {
    console.error('Error loading dashboard stats:', err); // Mencetak error ke konsol
    alert('Failed to load dashboard statistics. Please ensure backend is running and provides the correct data.'); // Menampilkan pesan error ke user
  }
}

// ======================================================
// 5. CATEGORIES FUNCTIONS
// ======================================================

function loadCategoriesContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Categories</h2>
      <button class="btn" id="addCategoryBtn"><i class="fas fa-plus"></i> Add Category</button>
    </div>

    ${createToolbarHTML('Categories')} 

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Icon</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="categoriesTable">
        </tbody>
      </table>
    </div>

    ${createPaginationHTML()}

    <div id="categoryModal" class="modal">
      <div class="modal-content">
        <span class="close-btn" id="closeModalBtn">&times;</span>
        <h3 class="modal-title" id="modalTitle">Add New Category</h3>
        <form id="categoryForm">
            <input type="hidden" id="categoryId">
            <div class="form-group">
                <label for="categoryName">Category Name</label>
                <input type="text" id="categoryName" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="categoryIcon">Font Awesome Icon Class</label>
                <input type="text" id="categoryIcon" class="form-control" placeholder="e.g., fas fa-gamepad">
            </div>
            <div class="form-group">
                <label for="categoryStatus">Status</label>
                <select id="categoryStatus" class="form-control">
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="cancelModalBtn">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Category</button>
            </div>
        </form>
      </div>
    </div>
  `;

  // Konfigurasi untuk halaman kategori
  const config = {
    endpoint: 'categories',
    containerId: 'categoriesTable',
    renderFunction: renderCategories,
    searchPlaceholder: 'Search categories...'
  };

  loadPaginatedData(config);
  setupToolbarAndPaginationEvents(config);
  setupCategoriesEventListeners();
}

// MODIFIKASI: Pastikan fungsi ini ada dan benar
function setupCategoriesEventListeners() {
  const categoryModal = document.getElementById('categoryModal');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const categoryForm = document.getElementById('categoryForm');

  if(addCategoryBtn) {
    addCategoryBtn.addEventListener('click', () => {
      editingCategoryId = null; 
      categoryForm.reset(); 
      document.getElementById('modalTitle').textContent = 'Add New Category'; 
      categoryModal.style.display = 'flex';
    });
  }

  if(closeModalBtn) closeModalBtn.addEventListener('click', () => categoryModal.style.display = 'none');
  if(cancelModalBtn) cancelModalBtn.addEventListener('click', () => categoryModal.style.display = 'none');
  
  window.addEventListener('click', (e) => { 
    if (e.target === categoryModal) {
      categoryModal.style.display = 'none';
    }
  });

  if(categoryForm) {
    categoryForm.addEventListener('submit', async (e) => {
      e.preventDefault(); 
      const categoryData = { 
        name: document.getElementById('categoryName').value,
        icon_class: document.getElementById('categoryIcon').value || null,
        status: document.getElementById('categoryStatus').value === '1' ? 1 : 0
      };

      try {
        const token = localStorage.getItem('adminToken');
        let response;
        const url = editingCategoryId 
          ? `http://localhost:5000/api/admin/categories/${editingCategoryId}`
          : 'http://localhost:5000/api/admin/categories';
        const method = editingCategoryId ? 'PUT' : 'POST';

        response = await fetch(url, {
          method: method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(categoryData)
        });

        if (!response.ok) { 
          const error = await response.json();
          throw new Error(error.error || 'Failed to save category');
        }
        
        // MODIFIKASI: Panggil loadPageContent untuk refresh
        loadPageContent(); 
        categoryModal.style.display = 'none';
        alert('Category saved successfully!');
      } catch (err) {
        console.error('Error saving category:', err);
        alert(`Error: ${err.message}`);
      }
    });
  }
}

// MODIFIKASI: Ubah fungsi deleteCategory
async function deleteCategory(categoryId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete category');
    
    // MODIFIKASI: Ganti loadCategories() dengan loadPageContent()
    loadPageContent(); 
    alert('Category deleted successfully!');
  } catch (err) {
    console.error('Error deleting category:', err);
    alert('Failed to delete category');
  }
}

// Tidak ada perubahan besar di editCategory, tapi pastikan HTML modalnya sudah benar
async function editCategory(categoryId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/categories/${categoryId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(await response.text());

    const category = await response.json();

    document.getElementById('categoryId').value = category.id;
    document.getElementById('categoryName').value = category.name;
    document.getElementById('categoryIcon').value = category.icon_class || '';
    document.getElementById('categoryStatus').value = category.status ? '1' : '0';

    document.getElementById('modalTitle').textContent = 'Edit Category';
    document.getElementById('categoryModal').style.display = 'flex';
    editingCategoryId = categoryId;
  } catch (err) {
    console.error('Error fetching category:', err);
    alert(`Failed to load category data: ${err.message}`);
  }
}

// MODIFIKASI: Ubah `renderCategories` untuk bekerja dengan `data.data`
function renderCategories(categories) {
  const tableBody = document.getElementById('categoriesTable');
  tableBody.innerHTML = '';

  if (!categories || categories.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4">No categories found.</td></tr>`;
    return;
  }

  categories.forEach(category => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${category.name}</td>
      <td><i class="${category.icon_class || 'fas fa-question'}"></i> ${category.icon_class || 'No icon'}</td>
      <td><span class="status-badge ${category.status ? 'active' : 'inactive'}">${category.status ? 'Active' : 'Inactive'}</span></td>
      <td class="action-buttons">
        <button class="action-btn edit" data-id="${category.id}"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" data-id="${category.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  // Event listener untuk tombol aksi bisa tetap di sini atau dipindah
  // ke dalam `setupCategoriesEventListeners` agar lebih terorganisir.
  document.querySelectorAll('.action-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => editCategory(e.currentTarget.dataset.id));
  });

  document.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Are you sure you want to delete this category?')) {
        deleteCategory(e.currentTarget.dataset.id);
      }
    });
  });
}

// ======================================================
// 6. PRODUCTS FUNCTIONS
// ======================================================

function loadProductsContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Products</h2>
      <button class="btn" id="addProductBtn"><i class="fas fa-plus"></i> Add Product</button>
    </div>

    ${createToolbarHTML('Products')}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Category</th>
            <th>Input Type</th>
            <th>Sort Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="productsTable"></tbody>
      </table>
    </div>

    ${createPaginationHTML()}

    <div id="productModal" class="modal">
      <div class="modal-content">
        <span class="close-btn" id="closeProductModalBtn">&times;</span>
        <h3 class="modal-title" id="productModalTitle">Add New Product</h3>
        <form id="productForm">
          <input type="hidden" id="productId">
          <div class="form-grid">
            <div class="form-group">
              <label for="productName">Product Name</label>
              <input type="text" id="productName" class="form-control" required>
            </div>
            <div class="form-group">
              <label for="productCategory">Category</label>
              <select id="productCategory" class="form-control" required></select>
            </div>
            <div class="form-group">
              <label for="productInputType">Input Type</label>
              <select id="productInputType" class="form-control">
                <option value="id_only">ID Only</option>
                <option value="id_zone">ID & Zone</option>
                <option value="id_server">ID & Server</option>
              </select>
            </div>
            <div class="form-group">
              <label for="productSortOrder">Sort Order</label>
              <input type="number" id="productSortOrder" class="form-control" value="0">
            </div>
             <div class="form-group">
                <label for="productIsPopular">Is Popular?</label>
                <select id="productIsPopular" class="form-control">
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                </select>
            </div>
            <div class="form-group">
                <label for="productNeedsPlayerCheck">Needs Player Check?</label>
                <select id="productNeedsPlayerCheck" class="form-control">
                    <option value="1">Yes</option>
                    <option value="0">No</option>
                </select>
            </div>
            <div class="form-group">
              <label for="productLogoUrl">Logo Image</label>
              <input type="file" id="productLogoUrl" class="form-control" accept="image/*">
            </div>
            <div class="form-group">
              <label for="productBannerUrl">Banner Image</label>
              <input type="file" id="productBannerUrl" class="form-control" accept="image/*">
            </div>
          </div>
          
          <!-- MODIFIKASI: Tambahkan field untuk Server Options -->
          <div class="form-group" id="serverOptionsGroup" style="display: none;">
            <label for="productServerOptions">Server Options (JSON Format)</label>
            <textarea id="productServerOptions" class="form-control" rows="5" placeholder='[{"name": "Asia", "value": "os_asia"},{"name": "America", "value": "os_usa"}]'></textarea>
            <small>Only fill this if Input Type is 'ID & Server'. Use valid JSON format.</small>
          </div>

          <div class="form-group">
            <label for="productDescription">Description</label>
            <textarea id="productDescription" class="form-control" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="productStatus">Status</label>
            <select id="productStatus" class="form-control">
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancelProductModalBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const config = {
    endpoint: 'products',
    containerId: 'productsTable',
    renderFunction: renderProducts,
    searchPlaceholder: 'Search products...'
  };

  loadPaginatedData(config);
  setupToolbarAndPaginationEvents(config);
  setupProductsEvents();
}

// Render products data into the table
function renderProducts(products) {
  const tableBody = document.getElementById('productsTable');
  tableBody.innerHTML = '';

  products.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <!-- <td>${product.id}</td> -->
      <td><img src="${product.logo_url || 'https://via.placeholder.com/50'}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover;"></td>
      <td>${product.name}</td>
      <td>${product.category_name || 'N/A'}</td>
      <td>${product.input_type || 'N/A'}</td>
      <td>${product.sort_order || 0}</td>
      <td><span class="status-badge ${product.status ? 'active' : 'inactive'}">${product.status ? 'Active' : 'Inactive'}</span></td>
      <td class="action-buttons">
        <button class="action-btn edit" data-id="${product.id}"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" data-id="${product.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  // Add event listeners to action buttons (edit and delete)
  document.querySelectorAll('#productsTable .action-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.currentTarget.dataset.id;
      editProduct(productId);
    });
  });

  document.querySelectorAll('#productsTable .action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = e.currentTarget.dataset.id;
      if (confirm('Are you sure you want to delete this product?')) {
        deleteProduct(productId);
      }
    });
  });
}

// Setup all event listeners specific to the products page
function setupProductsEvents() {
  const productModal = document.getElementById('productModal');
  const addProductBtn = document.getElementById('addProductBtn');
  const closeProductModalBtn = document.getElementById('closeProductModalBtn');
  const cancelProductModalBtn = document.getElementById('cancelProductModalBtn');
  const productForm = document.getElementById('productForm');
  // MODIFIKASI: Ambil elemen input type dan grup server options
  const productInputTypeSelect = document.getElementById('productInputType');
  const serverOptionsGroup = document.getElementById('serverOptionsGroup');

  // Open modal for adding a new product
  addProductBtn.addEventListener('click', async () => {
    editingProductId = null;
    productForm.reset();
    document.getElementById('productId').value = '';
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    await populateCategoriesDropdown();
    // MODIFIKASI: Pastikan field server options tersembunyi saat form direset
    serverOptionsGroup.style.display = 'none'; 
    productModal.style.display = 'flex';
  });

  // Close modal events
  closeProductModalBtn.addEventListener('click', () => productModal.style.display = 'none');
  cancelProductModalBtn.addEventListener('click', () => productModal.style.display = 'none');
  window.addEventListener('click', (e) => {
    if (e.target === productModal) {
      productModal.style.display = 'none';
    }
  });

  // MODIFIKASI: Tambahkan event listener untuk menampilkan/menyembunyikan field server options
  productInputTypeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'id_server') {
        serverOptionsGroup.style.display = 'block';
    } else {
        serverOptionsGroup.style.display = 'none';
    }
  });

  // Form submit handler for Add/Edit Product
  productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value);
    formData.append('category_id', document.getElementById('productCategory').value);
    formData.append('input_type', document.getElementById('productInputType').value);
    // MODIFIKASI: Tambahkan server_options ke FormData
    formData.append('server_options', document.getElementById('productServerOptions').value);
    formData.append('sort_order', parseInt(document.getElementById('productSortOrder').value) || 0);
    formData.append('is_popular', document.getElementById('productIsPopular').value);
    formData.append('needs_player_check', document.getElementById('productNeedsPlayerCheck').value);
    formData.append('description', document.getElementById('productDescription').value || '');
    formData.append('status', document.getElementById('productStatus').value);

    const logoFile = document.getElementById('productLogoUrl').files[0];
    if (logoFile) {
      formData.append('logo', logoFile);
    }
    const bannerFile = document.getElementById('productBannerUrl').files[0];
    if (bannerFile) {
      formData.append('banner', bannerFile);
    }

    try {
      const token = localStorage.getItem('adminToken');
      const headers = { 'Authorization': `Bearer ${token}` };
      let response;

      if (editingProductId) {
        response = await fetch(`http://localhost:5000/api/admin/products/${editingProductId}`, {
          method: 'PUT',
          headers: headers,
          body: formData
        });
      } else {
        response = await fetch('http://localhost:5000/api/admin/products', {
          method: 'POST',
          headers: headers,
          body: formData
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save product');
      }

      loadPageContent();
      productModal.style.display = 'none';
      alert('Product saved successfully!');
    } catch (err) {
      console.error('Error saving product:', err);
      alert(`Error: ${err.message}`);
    }
  });
}

// Fetch product data for editing and populate the modal
async function editProduct(productId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch product');
    }

    const product = await response.json();
    await populateCategoriesDropdown();
    
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category_id;
    document.getElementById('productInputType').value = product.input_type || '';
    document.getElementById('productSortOrder').value = product.sort_order || 0;
    document.getElementById('productIsPopular').value = product.is_popular ? '1' : '0';
    document.getElementById('productNeedsPlayerCheck').value = product.needs_player_check ? '1' : '0';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productStatus').value = product.status ? '1' : '0';
    // MODIFIKASI: Isi textarea server_options
    document.getElementById('productServerOptions').value = product.server_options || '';

    // MODIFIKASI: Tampilkan atau sembunyikan grup server_options berdasarkan data
    if (product.input_type === 'id_server') {
        document.getElementById('serverOptionsGroup').style.display = 'block';
    } else {
        document.getElementById('serverOptionsGroup').style.display = 'none';
    }

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productModal').style.display = 'flex';
    editingProductId = productId;

  } catch (err) {
    console.error('Error fetching product:', err);
    alert(`Failed to load product data: ${err.message}`);
  }
}

// Delete product from API
async function deleteProduct(productId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete product');

    // MODIFIKASI: Ganti loadProducts() dengan loadPageContent()
    loadPageContent(); 
    alert('Product deleted successfully!');
  } catch (err) {
    console.error('Error deleting product:', err);
    alert('Failed to delete product');
  }
}

// Helper to populate category dropdown
async function populateCategoriesDropdown() {
  const selectElement = document.getElementById('productCategory');
  if (!selectElement) { // BARU: Tambahkan pengecekan null untuk selectElement
    console.warn("Element 'productCategory' not found for dropdown.");
    return;
  }
  selectElement.innerHTML = '<option value="">Select Category</option>'; // Clear existing options
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch('http://localhost:5000/api/admin/categories', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch categories for dropdown');

    // MODIFIKASI: Ambil properti 'data' dari respons JSON
    const categoriesResponse = await response.json();
    const categories = categoriesResponse.data; // Asumsi API mengembalikan { data: [...] }

    if (categories && Array.isArray(categories)) { // BARU: Pastikan categories adalah array
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        selectElement.appendChild(option);
      });
    } else {
      console.warn('Categories data is not an array:', categoriesResponse);
      selectElement.innerHTML += '<option value="">No categories available</option>';
    }
  } catch (error) {
    console.error('Error populating categories dropdown:', error);
    // Fallback or error message
    selectElement.innerHTML += '<option value="">Error loading categories</option>';
  }
}

// ======================================================
// 7. ITEM GROUPS FUNCTIONS
// ======================================================

// Load item groups content HTML structure
function loadItemGroupsContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Item Groups</h2>
      <button class="btn" id="addItemGroupBtn"><i class="fas fa-plus"></i> Add Item Group</button>
    </div>

    ${createToolbarHTML('Item Groups')}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Group Name</th>
            <th>Sort Order</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="itemGroupsTable"></tbody>
      </table>
    </div>

    ${createPaginationHTML()}

    <div id="itemGroupModal" class="modal">
      <div class="modal-content">
        <span class="close-btn" id="closeItemGroupModalBtn">&times;</span>
        <h3 class="modal-title" id="itemGroupModalTitle">Add New Item Group</h3>
        <form id="itemGroupForm">
                    <input type="hidden" id="itemGroupId">

          <div class="form-grid">
            <div class="form-group">
              <label for="itemGroupProduct">Product *</label>
              <select id="itemGroupProduct" class="form-control" required>
                <!-- Products will be loaded here -->
              </select>
            </div>

            <div class="form-group">
              <label for="itemGroupName">Group Name *</label>
              <input type="text" id="itemGroupName" class="form-control" required>
            </div>

            <div class="form-group">
              <label for="itemGroupSortOrder">Sort Order</label>
              <input type="number" id="itemGroupSortOrder" class="form-control" value="0">
            </div>

            <div class="form-group">
              <label for="itemGroupStatus">Status *</label>
              <select id="itemGroupStatus" class="form-control" required>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancelItemGroupModalBtn">Cancel</button>
            <button type="submit" class="btn">Save Item Group</button>
          </div>
          </form>
      </div>
    </div>
  `;

  const config = {
    endpoint: 'item-groups',
    containerId: 'itemGroupsTable',
    renderFunction: renderItemGroups,
    searchPlaceholder: 'Search by group or product name...'
  };

  loadPaginatedData(config);
  setupToolbarAndPaginationEvents(config);
  setupItemGroupsEvents();
}

function renderItemGroups(itemGroups) {
  const tableBody = document.getElementById('itemGroupsTable');
  tableBody.innerHTML = '';

  if (!itemGroups || itemGroups.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5">No item groups found.</td></tr>`;
    return;
  }

  itemGroups.forEach(group => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${group.product_name || 'N/A'}</td>
      <td>${group.name}</td>
      <td>${group.sort_order || 0}</td>
      <td><span class="status-badge ${group.status ? 'active' : 'inactive'}">${group.status ? 'Active' : 'Inactive'}</span></td>
      <td class="action-buttons">
        <button class="action-btn edit" data-id="${group.id}"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" data-id="${group.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('#itemGroupsTable .action-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => editItemGroup(e.currentTarget.dataset.id));
  });

  document.querySelectorAll('#itemGroupsTable .action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Are you sure you want to delete this item group?')) {
        deleteItemGroup(e.currentTarget.dataset.id);
      }
    });
  });
}

// Setup all event listeners specific to the item groups page
function setupItemGroupsEvents() {
  const itemGroupModal = document.getElementById('itemGroupModal');
  const addItemGroupBtn = document.getElementById('addItemGroupBtn');
  const closeItemGroupModalBtn = document.getElementById('closeItemGroupModalBtn');
  const cancelItemGroupModalBtn = document.getElementById('cancelItemGroupModalBtn');
  const itemGroupForm = document.getElementById('itemGroupForm');

  // Open modal for adding a new item group
  addItemGroupBtn.addEventListener('click', async () => {
    editingCategoryId = null; // Reset ID grup item yang diedit
    itemGroupForm.reset(); // Mengosongkan form
    document.getElementById('itemGroupId').value = ''; // Pastikan input hidden ID dikosongkan
    document.getElementById('itemGroupModalTitle').textContent = 'Add New Item Group'; // Mengatur judul modal
    await populateProductsDropdown(); // Memuat dropdown produk saat modal dibuka
    itemGroupModal.style.display = 'flex'; // Menampilkan modal
  });

  // Close modal when 'X' button is clicked
  closeItemGroupModalBtn.addEventListener('click', () => {
    itemGroupModal.style.display = 'none'; // Menyembunyikan modal
  });

  // Close modal when 'Cancel' button is clicked
  cancelItemGroupModalBtn.addEventListener('click', () => {
    itemGroupModal.style.display = 'none'; // Menyembunyikan modal
  });

  // Close modal when clicking outside the modal content
  window.addEventListener('click', (e) => {
    if (e.target === itemGroupModal) {
      itemGroupModal.style.display = 'none';
    }
  });

  // Form submit handler for Add/Edit Item Group
  itemGroupForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah submit form default

    const itemGroupData = { // Mengambil data dari form
      product_id: document.getElementById('itemGroupProduct').value,
      name: document.getElementById('itemGroupName').value,
      sort_order: parseInt(document.getElementById('itemGroupSortOrder').value) || 0,
      status: document.getElementById('itemGroupStatus').value === '1' ? 1 : 0
    };

    try {
      const token = localStorage.getItem('adminToken');
      let response;

      if (editingCategoryId) { // Jika ada ID grup item yang diedit, lakukan update
        response = await fetch(`http://localhost:5000/api/admin/item-groups/${editingCategoryId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(itemGroupData)
        });
      } else { // Jika tidak ada ID, lakukan create
        response = await fetch('http://localhost:5000/api/admin/item-groups', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(itemGroupData)
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save item group');
      }

      loadPageContent(); // Memuat ulang daftar grup item
      itemGroupModal.style.display = 'none'; // Menyembunyikan modal setelah berhasil
      alert('Item Group saved successfully!');
    } catch (err) {
      console.error('Error saving item group:', err);
      alert(`Error: ${err.message}`);
    }
  });
}

// Fetch item group data for editing and populate the modal
async function editItemGroup(itemGroupId) {
  try {
    const token = localStorage.getItem('adminToken');

    const response = await fetch(`http://localhost:5000/api/admin/item-groups/${itemGroupId}`, { // Mengambil data grup item spesifik
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch item group');
    }

    const itemGroup = await response.json();

    // Populate products dropdown first, then select the item group's product
    await populateProductsDropdown(); // Memuat dropdown produk

    // Mengisi form modal dengan data grup item
    document.getElementById('itemGroupId').value = itemGroup.id;
    document.getElementById('itemGroupProduct').value = itemGroup.product_id; // Pilih produk yang sesuai
    document.getElementById('itemGroupName').value = itemGroup.name;
    document.getElementById('itemGroupSortOrder').value = itemGroup.sort_order || 0;
    document.getElementById('itemGroupStatus').value = itemGroup.status ? '1' : '0';

    document.getElementById('itemGroupModalTitle').textContent = 'Edit Item Group'; // Mengatur judul modal
    document.getElementById('itemGroupModal').style.display = 'flex'; // Menampilkan modal
    editingCategoryId = itemGroupId; // Menyimpan ID grup item yang sedang diedit

  } catch (err) {
    console.error('Error fetching item group:', err);
    alert(`Failed to load item group data: ${err.message}`);
  }
}

// Delete item group from API
async function deleteItemGroup(itemGroupId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/item-groups/${itemGroupId}`, { // Mengirim permintaan DELETE ke API
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete item group');

    loadPageContent(); // Memuat ulang daftar grup item setelah berhasil dihapus
    alert('Item Group deleted successfully!');
  } catch (err) {
    console.error('Error deleting item group:', err);
    alert('Failed to delete item group');
  }
}

// Helper function to populate products dropdown
async function populateProductsDropdown() {
    const selectElement = document.getElementById('itemGroupProduct');
    if (!selectElement) { // BARU: Tambahkan pengecekan null untuk selectElement
      console.warn("Element 'itemGroupProduct' not found for dropdown.");
      return;
    }
    selectElement.innerHTML = '<option value="">Select Product</option>'; // Mengosongkan opsi yang ada
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin/products', { // Mengambil produk dari API
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch products for dropdown');
      
      // MODIFIKASI: Ambil properti 'data' dari respons JSON
      const productsResponse = await response.json();
      const products = productsResponse.data; // Asumsi API mengembalikan { data: [...] }

      if (products && Array.isArray(products)) { // BARU: Pastikan products adalah array
      products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        selectElement.appendChild(option);
      });

    } else {
      console.warn('products data is not an array:', productsResponse);
      selectElement.innerHTML += '<option value="">No products available</option>';
    }

    } catch (error) {
      console.error('Error populating products dropdown:', error);
      // Anda bisa menambahkan pesan error di UI jika perlu
      selectElement.innerHTML += '<option value="">Error loading products</option>';
    }
}

// ======================================================
// 8. PRODUCT ITEMS FUNCTIONS
// ======================================================
function loadProductItemsContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Product Items</h2>
      <button class="btn" id="addProductItemBtn"><i class="fas fa-plus"></i> Add Product Item</button>
    </div>

    ${createToolbarHTML('Product Items')}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <!-- <th>ID</th> -->
            <th>Icon</th>
            <th>Product Group</th>
            <th>Item Name</th>
            <th>Product Code</th>
            <th>Base Price</th>
            <th>Selling Price</th>
            <th>Discount (%)</th>
            <th>Flash Sale</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="productItemsTable"></tbody>
      </table>
    </div>

    ${createPaginationHTML()}

    <div id="productItemModal" class="modal">
        <div class="modal-content">
            <span class="close-btn" id="closeProductItemModalBtn">&times;</span>
            <h3 class="modal-title" id="productItemModalTitle">Add New Product Item</h3>
            <form id="productItemForm">
              <input type="hidden" id="productItemId">

              <div class="form-grid">
                <div class="form-group">
                  <label for="productItemItemGroup">Item Group *</label>
                  <select id="productItemItemGroup" class="form-control" required>
                    <!-- Item Groups will be loaded here -->
                  </select>
                </div>

                <div class="form-group">
                  <label for="productItemName">Item Name *</label>
                  <input type="text" id="productItemName" class="form-control" required>
                </div>

                <div class="form-group">
                  <label for="productItemCode">Product Code *</label>
                  <input type="text" id="productItemCode" class="form-control" required>
                </div>

                <div class="form-group">
                  <label for="productItemBasePrice">Base Price *</label>
                  <input type="number" step="0.01" id="productItemBasePrice" class="form-control" required value="0">
                </div>

                <div class="form-group">
                  <label for="productItemSellingPrice">Selling Price *</label>
                  <input type="number" step="0.01" id="productItemSellingPrice" class="form-control" required value="0">
                </div>

                <div class="form-group">
                  <label for="productItemDiscount">Discount Percentage</label>
                  <input type="number" step="0.01" id="productItemDiscount" class="form-control" value="0">
                </div>

                <div class="form-group">
                  <label for="productItemFlashSale">Flash Sale?</label>
                  <select id="productItemFlashSale" class="form-control">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>

                <div class="form-group full-width">
                  <label for="productItemIconUrl">Icon URL (Image File)</label>
                  <input type="file" id="productItemIconUrl" class="form-control">
                  <small>Pilih file gambar untuk ikon item produk.</small>
                </div>

                <div class="form-group">
                  <label for="productItemStatus">Status *</label>
                  <select id="productItemStatus" class="form-control" required>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="cancelProductItemModalBtn">Cancel</button>
                <button type="submit" class="btn">Save Product Item</button>
              </div>
            </form>
        </div>
    </div>
  `;

  const config = {
    endpoint: 'product-items',
    containerId: 'productItemsTable',
    renderFunction: renderProductItems,
    searchPlaceholder: 'Search by item, product, or group name...'
  };

  loadPaginatedData(config);
  setupToolbarAndPaginationEvents(config);
  setupProductItemsEvents();
}

function renderProductItems(productItems) {
  const tableBody = document.getElementById('productItemsTable');
  tableBody.innerHTML = '';

  if (!productItems || productItems.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7">No product items found.</td></tr>`;
    return;
  }

  productItems.forEach(item => {
    const row = document.createElement('tr');
    const iconUrl = item.icon_url || 'https://placehold.co/50x50/cccccc/333333?text=No+Img';
    
    row.innerHTML = `
      <td><img src="${iconUrl}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;"></td>
      <td>${item.product_name || 'N/A'} - ${item.group_name || 'N/A'}</td>
      <td>${item.name}</td>
      <td>${item.product_code}</td>
      <td>Rp ${parseFloat(item.base_price).toLocaleString()}</td>
      <td>Rp ${parseFloat(item.selling_price).toLocaleString()}</td>
      <td>${item.discount_percentage || 0}%</td>
      <td><span class="status-badge ${item.flash_sale ? 'active' : 'inactive'}">${item.flash_sale ? 'Yes' : 'No'}</span></td>
      <td><span class="status-badge ${item.status ? 'active' : 'inactive'}">${item.status ? 'Active' : 'Inactive'}</span></td>
      <td class="action-buttons">
        <button class="action-btn edit" data-id="${item.id}"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" data-id="${item.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('#productItemsTable .action-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => editProductItem(e.currentTarget.dataset.id));
  });

  document.querySelectorAll('#productItemsTable .action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Are you sure you want to delete this product item?')) {
        deleteProductItem(e.currentTarget.dataset.id);
      }
    });
  });
}

// Setup all event listeners specific to the product items page
function setupProductItemsEvents() {
  const productItemModal = document.getElementById('productItemModal');
  const addProductItemBtn = document.getElementById('addProductItemBtn');
  const closeProductItemModalBtn = document.getElementById('closeProductItemModalBtn');
  const cancelProductItemModalBtn = document.getElementById('cancelProductItemModalBtn');
  const productItemForm = document.getElementById('productItemForm');

  // Open modal for adding a new product item
  addProductItemBtn.addEventListener('click', async () => {
    editingCategoryId = null; // Reset ID item produk yang diedit
    productItemForm.reset(); // Mengosongkan form
    document.getElementById('productItemId').value = ''; // Pastikan input hidden ID dikosongkan
    document.getElementById('productItemModalTitle').textContent = 'Add New Product Item'; // Mengatur judul modal
    await populateItemGroupsDropdown(); // Memuat dropdown grup item saat modal dibuka
    productItemModal.style.display = 'flex'; // Menampilkan modal
  });

  // Close modal when 'X' button is clicked
  closeProductItemModalBtn.addEventListener('click', () => {
    productItemModal.style.display = 'none'; // Menyembunyikan modal
  });

  // Close modal when 'Cancel' button is clicked
  cancelProductItemModalBtn.addEventListener('click', () => {
    productItemModal.style.display = 'none'; // Menyembunyikan modal
  });

  // Close modal when clicking outside the modal content
  window.addEventListener('click', (e) => {
    if (e.target === productItemModal) {
      productItemModal.style.display = 'none';
    }
  });

  // Form submit handler for Add/Edit Product Item
  productItemForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Mencegah submit form default

    // Mengambil data dari form, termasuk file
    const formData = new FormData(); // <-- GUNAKAN FormData untuk upload file
    formData.append('item_group_id', document.getElementById('productItemItemGroup').value);
    formData.append('name', document.getElementById('productItemName').value);
    formData.append('product_code', document.getElementById('productItemCode').value);
    formData.append('base_price', parseFloat(document.getElementById('productItemBasePrice').value) || 0);
    formData.append('selling_price', parseFloat(document.getElementById('productItemSellingPrice').value) || 0);
    formData.append('discount_percentage', parseFloat(document.getElementById('productItemDiscount').value) || 0);
    formData.append('flash_sale', document.getElementById('productItemFlashSale').value);
    formData.append('status', document.getElementById('productItemStatus').value);

    // Menambahkan file icon jika dipilih
    const iconFile = document.getElementById('productItemIconUrl').files[0];
    if (iconFile) {
      formData.append('icon', iconFile); // 'icon' adalah nama field yang akan diterima Multer di backend
    }

    try {
      const token = localStorage.getItem('adminToken');
      let response;

      // Hapus header Content-Type saat menggunakan FormData, browser akan mengaturnya otomatis
      const headers = {
        'Authorization': `Bearer ${token}`
        // 'Content-Type': 'multipart/form-data' <-- JANGAN TAMBAHKAN INI SECARA MANUAL!
      };

      if (editingCategoryId) { // Jika ada ID item produk yang diedit, lakukan update
        response = await fetch(`http://localhost:5000/api/admin/product-items/${editingCategoryId}`, {
          method: 'PUT',
          headers: headers,
          body: formData // <-- Kirim FormData
        });
      } else { // Jika tidak ada ID, lakukan create
        response = await fetch('http://localhost:5000/api/admin/product-items', {
          method: 'POST',
          headers: headers,
          body: formData // <-- Kirim FormData
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save product item');
      }

      loadPageContent(); // Memuat ulang daftar item produk
      productItemModal.style.display = 'none'; // Menyembunyikan modal setelah berhasil
      alert('Product Item saved successfully!');
    } catch (err) {
      console.error('Error saving product item:', err);
      alert(`Error: ${err.message}`);
    }
  });
}

// Fetch product item data for editing and populate the modal
async function editProductItem(productItemId) {
  try {
    const token = localStorage.getItem('adminToken');

    const response = await fetch(`http://localhost:5000/api/admin/product-items/${productItemId}`, { // Mengambil data item produk spesifik
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch product item');
    }

    const item = await response.json();

    // Populate item groups dropdown first, then select the item's group
    await populateItemGroupsDropdown(); // Memuat dropdown grup item

    // Mengisi form modal dengan data item produk
    document.getElementById('productItemId').value = item.id;
    document.getElementById('productItemItemGroup').value = item.item_group_id; // Pilih grup item yang sesuai
    document.getElementById('productItemName').value = item.name;
    document.getElementById('productItemCode').value = item.product_code;
    document.getElementById('productItemBasePrice').value = item.base_price;
    document.getElementById('productItemSellingPrice').value = item.selling_price;
    document.getElementById('productItemDiscount').value = item.discount_percentage || 0;
    document.getElementById('productItemFlashSale').value = item.flash_sale ? '1' : '0';
    // Untuk input type="file", Anda TIDAK BISA mengisi nilainya secara langsung karena alasan keamanan browser.
    // Pengguna harus memilih file baru jika ingin mengubahnya.
    // document.getElementById('productItemIconUrl').value = item.icon_url || ''; // HAPUS BARIS INI
    document.getElementById('productItemStatus').value = item.status ? '1' : '0';

    document.getElementById('productItemModalTitle').textContent = 'Edit Product Item'; // Mengatur judul modal
    document.getElementById('productItemModal').style.display = 'flex'; // Menampilkan modal
    editingCategoryId = productItemId; // Menyimpan ID item produk yang sedang diedit

  } catch (err) {
    console.error('Error fetching product item:', err);
    alert(`Failed to load product item data: ${err.message}`);
  }
}

// Delete product item from API
async function deleteProductItem(productItemId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/product-items/${productItemId}`, { // Mengirim permintaan DELETE ke API
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete product item');

    loadPageContent(); // Memuat ulang daftar item produk setelah berhasil dihapus
    alert('Product Item deleted successfully!');
  } catch (err) {
    console.error('Error deleting product item:', err);
    alert('Failed to delete product item');
  }
}

// Helper function to populate item groups dropdown
async function populateItemGroupsDropdown() {
    const selectElement = document.getElementById('productItemItemGroup');
    if (!selectElement) { // BARU: Tambahkan pengecekan null untuk selectElement
      console.warn("Element 'productItemItemGroup' not found for dropdown.");
      return;
    }
    selectElement.innerHTML = '<option value="">Select Item Group</option>'; // Mengosongkan opsi yang ada
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('http://localhost:5000/api/admin/item-groups', { // Mengambil grup item dari API
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch item groups for dropdown');

    // MODIFIKASI: Ambil properti 'data' dari respons JSON
    const itemGroupsResponse = await response.json();
    const itemGroups = itemGroupsResponse.data; // Asumsi API mengembalikan { data: [...] }

    if (itemGroups && Array.isArray(itemGroups)) { // BARU: Pastikan categories adalah array
      itemGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = `${group.product_name} - ${group.name}`; // Tampilkan nama produk dan grup
        selectElement.appendChild(option);
      });
    } else {
      console.warn('Categories data is not an array:', categoriesResponse);
      selectElement.innerHTML += '<option value="">No categories available</option>';
    }
    } catch (error) {
      console.error('Error populating item groups dropdown:', error);
      // Anda bisa menambahkan pesan error di UI jika perlu
      selectElement.innerHTML += '<option value="">Error loading categories</option>';
    }
}

// ======================================================
// 9. TRANSACTIONS FUNCTIONS
// ======================================================

// Load transactions content HTML structure
function loadTransactionsContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Transactions</h2>
    </div>

    <div class="transaction-filters-container">
      <button class="btn filter-btn" id="filterProblemTransactionsBtn" data-filter="problem">
        <i class="fas fa-exclamation-triangle"></i> Bermasalah
      </button>
      <button class="btn filter-btn active" id="filterAllTransactionsBtn" data-filter="all">
        <i class="fas fa-history"></i> Riwayat Transaksi
      </button>
    </div>

    <div class="transactions-page"> 
      ${createToolbarHTML('Transactions')}
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice</th>
            <th>Buyer</th>
            <th>Category</th>
            <th>Product</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="transactionsTable"></tbody>
      </table>
    </div>

    ${createPaginationHTML()}

    <div id="transactionDetailModal" class="modal">
        <div class="modal-content">
            <span class="close-btn" id="closeTransactionModalBtn">&times;</span>
            <h3 class="modal-title" id="transactionModalTitle">Transaction Details</h3>
            <div id="transactionDetailsContent">
                <p><strong>Invoice:</strong> <span id="detailInvoiceNumber"></span></p>
                <p><strong>Date:</strong> <span id="detailTransactionDate"></span></p>
                <p><strong>Buyer:</strong> <span id="detailUserName"></span> (<span id="detailUserEmail"></span>)</p>
                <p><strong>Category:</strong> <span id="detailCategoryName"></span></p>
                <p><strong>Product:</strong> <span id="detailProductName"></span></p>
                <p><strong>Item:</strong> <span id="detailItemName"></span></p>
                <p><strong>Amount:</strong> <span id="detailTotalPrice"></span></p>
                <p><strong>Payment:</strong> <span id="detailPaymentMethod"></span></p>
                <p><strong>Status:</strong> <span id="detailStatus" class="status-badge"></span></p>
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="updateStatusSelect">Update Status</label>
                <select id="updateStatusSelect" class="form-control">
                    <option value="PENDING">Pending</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="cancelTransactionModalBtn">Close</button>
                <button type="button" class="btn btn-primary" id="saveTransactionStatusBtn">Save Status</button>
            </div>
        </div>
    </div>
  `;

  // Terapkan state filter saat ini ke kelas tombol
  document.querySelector(`.transaction-filters-container .filter-btn[data-filter="${currentTransactionView}"]`).classList.add('active');
  if (currentTransactionView === 'all') {
      document.querySelector(`.transaction-filters-container .filter-btn[data-filter="problem"]`).classList.remove('active');
  } else {
      document.querySelector(`.transaction-filters-container .filter-btn[data-filter="all"]`).classList.remove('active');
  }

  const config = {
    endpoint: `transactions?filter=${currentTransactionView}`,
    containerId: 'transactionsTable',
    renderFunction: renderTransactions,
    searchPlaceholder: 'Search by invoice or buyer...'
  };

  loadPaginatedData(config);
  setupToolbarAndPaginationEvents(config);
  setupTransactionsEvents();
}

function renderTransactions(transactions) {
  const tableBody = document.getElementById('transactionsTable');
  tableBody.innerHTML = '';

  if (!transactions || transactions.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="8">No transactions found.</td></tr>`;
    return;
  }

  transactions.forEach(transaction => {
    const row = document.createElement('tr');
    const statusClass = (transaction.status || 'pending').toLowerCase();

    row.innerHTML = `
      <td>${new Date(transaction.transaction_date).toLocaleString('id-ID')}</td>
      <td>${transaction.invoice_number}</td>
      <td>${transaction.user_name || 'Guest'}</td>
      <td>${transaction.category_name || 'N/A'}</td>
      <td>${transaction.product_name || 'N/A'}</td>
      <td>Rp ${parseFloat(transaction.total_price).toLocaleString()}</td>
      <td><span class="status-badge ${statusClass}">${transaction.status}</span></td>
      <td class="action-buttons">
        <button class="action-btn view" data-id="${transaction.id}"><i class="fas fa-eye"></i></button>
        <button class="action-btn delete" data-id="${transaction.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('#transactionsTable .action-btn.view').forEach(btn => {
    btn.addEventListener('click', (e) => viewTransactionDetails(e.currentTarget.dataset.id));
  });

  document.querySelectorAll('#transactionsTable .action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Are you sure you want to delete this transaction?')) {
        deleteTransaction(e.currentTarget.dataset.id);
      }
    });
  });
}

// Setup all event listeners specific to the transactions page
function setupTransactionsEvents() {
  const filterProblemBtn = document.getElementById('filterProblemTransactionsBtn');
  const filterAllBtn = document.getElementById('filterAllTransactionsBtn');
  
  if (filterProblemBtn) {
    filterProblemBtn.addEventListener('click', () => {
      currentTransactionView = 'problem';
      // Cukup panggil loadPageContent, dia akan membaca state baru
      loadPageContent(); 
    });
  }

  if (filterAllBtn) {
    filterAllBtn.addEventListener('click', () => {
      currentTransactionView = 'all';
       // Cukup panggil loadPageContent
      loadPageContent();
    });
  }
  
  // Event listener untuk modal
  const modal = document.getElementById('transactionDetailModal');
  const closeBtn = document.getElementById('closeTransactionModalBtn');
  const cancelBtn = document.getElementById('cancelTransactionModalBtn');
  const saveBtn = document.getElementById('saveTransactionStatusBtn');

  if(closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
  if(cancelBtn) cancelBtn.onclick = () => modal.style.display = 'none';
  window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; }
  
  if(saveBtn) {
    saveBtn.onclick = async () => {
      const transactionId = saveBtn.dataset.id;
      const newStatus = document.getElementById('updateStatusSelect').value;
      await updateTransactionStatus(transactionId, newStatus);
    };
  }

}

// Fetch transaction details and populate the modal
async function viewTransactionDetails(transactionId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/transactions/${transactionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch transaction details');
    }

    const transaction = await response.json();

    // Populate modal with details
    document.getElementById('detailInvoiceNumber').textContent = transaction.invoice_number;
    document.getElementById('detailTransactionDate').textContent = new Date(transaction.transaction_date).toLocaleString();
    document.getElementById('detailUserName').textContent = transaction.user_name || 'Guest';
    document.getElementById('detailUserEmail').textContent = transaction.user_email || 'N/A';
    document.getElementById('detailCategoryName').textContent = transaction.category_name || 'N/A';
    document.getElementById('detailProductName').textContent = transaction.product_name || 'N/A';
    document.getElementById('detailItemName').textContent = transaction.item_name || 'N/A';
    document.getElementById('detailTotalPrice').textContent = `Rp ${parseFloat(transaction.total_price).toLocaleString()}`;
    document.getElementById('detailPaymentMethod').textContent = transaction.payment_method || 'N/A';
    document.getElementById('detailStatus').textContent = transaction.status;
    document.getElementById('detailStatus').className = `status-badge ${transaction.status.toLowerCase()}`; // Update class for styling

    // Set dropdown to current status
    document.getElementById('updateStatusSelect').value = transaction.status;

    // Store transaction ID in the save button for later use
    document.getElementById('saveTransactionStatusBtn').dataset.id = transactionId;

    document.getElementById('transactionModalTitle').textContent = `Transaction #${transaction.invoice_number}`;
    document.getElementById('transactionDetailModal').style.display = 'flex';

  } catch (err) {
    console.error('Error fetching transaction details:', err);
    alert(`Failed to load transaction details: ${err.message}`);
  }
}

// Update transaction status via API
async function updateTransactionStatus(transactionId, newStatus) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/transactions/${transactionId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update transaction status');
    }

    alert('Transaction status updated successfully!');
    transactionDetailModal.style.display = 'none'; // Close modal
    loadPageContent(); // Reload transactions with current filter
  } catch (err) {
    console.error('Error updating transaction status:', err);
    alert(`Failed to update transaction status: ${err.message}`);
  }
}

// Delete transaction from API
async function deleteTransaction(transactionId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/transactions/${transactionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Failed to delete transaction');

    loadPageContent(); // Reload transactions with current filter
    alert('Transaction deleted successfully!');
  } catch (err) {
    console.error('Error deleting transaction:', err);
    alert('Failed to delete transaction');
  }
}

// ======================================================
// 10. USERS FUNCTIONS
// ======================================================
function loadUsersContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">User Management</h2>
    </div>

    ${createToolbarHTML('Users')}

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="usersTable"></tbody>
      </table>
    </div>

    ${createPaginationHTML()}

    <div id="userModal" class="modal">
      <div class="modal-content">
        <span class="close-btn" id="closeUserModalBtn">&times;</span>
        <h3 class="modal-title" id="userModalTitle">Edit User Details</h3>
        <form id="userForm">
          <input type="hidden" id="userId">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="userName" class="form-control" disabled>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="userEmail" class="form-control" disabled>
          </div>
          <div class="form-group">
            <label for="userRole">Role</label>
            <select id="userRole" class="form-control">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="form-group">
            <label for="userBalance">Balance</label>
            <input type="number" id="userBalance" class="form-control" step="0.01">
          </div>
          <div class="form-group">
            <label for="userStatus">Status</label>
            <select id="userStatus" class="form-control">
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="cancelUserModalBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
    
    `;

  const config = {
    endpoint: 'users',
    containerId: 'usersTable',
    renderFunction: renderUsers,
    searchPlaceholder: 'Search by username or email...'
  };
  
  loadPaginatedData(config);
  setupToolbarAndPaginationEvents(config);
  // setupUsersEvents sekarang hanya akan mengurus modal edit.
  setupUsersEvents(); 
}

function renderUsers(users) {
  const tableBody = document.getElementById('usersTable');
  tableBody.innerHTML = '';

  if (!users || users.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
    return;
  }

  users.forEach(user => {
    const row = document.createElement('tr');
    const statusClass = user.status ? 'active' : 'inactive';

    row.innerHTML = `
      <td>${user.id}</td>
      <td>${user.username || 'N/A'}</td>
      <td>${user.email}</td>
      <td>${user.role}</td>
      <td>Rp ${parseFloat(user.gampang_coin_balance || 0).toLocaleString()}</td>
      <td><span class="status-badge ${statusClass}">${user.status ? 'Active' : 'Inactive'}</span></td>
      <td class="action-buttons">
        <button class="action-btn edit" data-id="${user.id}"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" data-id="${user.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('#usersTable .action-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => editUser(e.currentTarget.dataset.id));
  });

  document.querySelectorAll('#usersTable .action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        deleteUser(e.currentTarget.dataset.id);
      }
    });
  });
}

// Setup all event listeners specific to the users page
function setupUsersEvents() {
  const userModal = document.getElementById('userModal');
  const closeUserModalBtn = document.getElementById('closeUserModalBtn');
  const cancelUserModalBtn = document.getElementById('cancelUserModalBtn');
  const userForm = document.getElementById('userForm');

  // --- Kode untuk filter modal yang lama sudah dihapus ---

  // Event listener untuk modal edit user
  if (closeUserModalBtn) {
    closeUserModalBtn.addEventListener('click', () => {
      userModal.style.display = 'none';
    });
  }

  if (cancelUserModalBtn) {
    cancelUserModalBtn.addEventListener('click', () => {
      userModal.style.display = 'none';
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === userModal) {
      userModal.style.display = 'none';
    }
  });

  // Form submit handler untuk User Update
  if (userForm) {
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userId = document.getElementById('userId').value;
      const userData = {
        role: document.getElementById('userRole').value,
        gampang_coin_balance: parseFloat(document.getElementById('userBalance').value) || 0,
        status: document.getElementById('userStatus').value,
      };

      try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(userData)
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to update user');
        }

        loadPageContent();
        userModal.style.display = 'none';
        alert('User updated successfully!');
      } catch (err) {
        console.error('Error updating user:', err);
        alert(`Error: ${err.message}`);
      }
    });
  }
}

// Fetch user data for editing and populate the modal
async function editUser(userId) {
  try {
    const token = localStorage.getItem('adminToken');

    const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, { // Mengambil data user spesifik
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch user');
    }

    const user = await response.json();

    // Mengisi form modal dengan data user
    document.getElementById('userId').value = user.id;
    document.getElementById('userName').value = user.username || '';
    document.getElementById('userEmail').value = user.email || '';
    document.getElementById('userRole').value = user.role;
    document.getElementById('userBalance').value = parseFloat(user.gampang_coin_balance || 0);
    document.getElementById('userStatus').value = user.status ? '1' : '0';
    // document.getElementById('userDeviceId').value = user.device_id || ''; // Uncomment when active

    document.getElementById('userModalTitle').textContent = 'Edit User Details'; // Mengatur judul modal
    document.getElementById('userModal').style.display = 'flex'; // Menampilkan modal
    

  } catch (err) {
    console.error('Error fetching user:', err);
    alert(`Failed to load user data: ${err.message}`);
  }
}

// Delete user from API
async function deleteUser(userId) {
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, { // Mengirim permintaan DELETE ke API
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
    }

    loadPageContent(); // Memuat ulang daftar user setelah berhasil dihapus
    alert('User deleted successfully!');
  } catch (err) {
    console.error('Error deleting user:', err);
    alert(`Failed to delete user: ${err.message}`);
  }
}


// ======================================================
// XX. ARTICLES FUNCTIONS
// ======================================================

function loadArticlesContent(container) {
  container.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">Articles</h2>
      <button class="btn" id="addArticleBtn"><i class="fas fa-plus"></i> Add Article</button>
    </div>

    ${createToolbarHTML('Articles')} 

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Thumbnail</th>
            <th>Title</th>
            <th>Author</th>
            <th>Status</th>
            <th>Created At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="articlesTable"></tbody>
      </table>
    </div>

    ${createPaginationHTML()}

    <div id="articleModal" class="modal">
      <div class="modal-content" style="max-width: 800px;">
        <span class="close-btn" id="closeArticleModalBtn">&times;</span>
        <h3 class="modal-title" id="articleModalTitle">Add New Article</h3>
        <form id="articleForm">
            <input type="hidden" id="articleId">
            <div class="form-group">
                <label for="articleTitle">Title</label>
                <input type="text" id="articleTitle" class="form-control" required>
            </div>
            <div class="form-grid">
                <div class="form-group">
                    <label for="articleAuthor">Author Name</label>
                    <input type="text" id="articleAuthor" class="form-control" value="Redaksi" required>
                </div>
                <div class="form-group">
                    <label for="articleStatus">Status</label>
                    <select id="articleStatus" class="form-control">
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label for="articleThumbnail">Thumbnail Image</label>
                <input type="file" id="articleThumbnail" class="form-control" accept="image/*">
            </div>
            <div class="form-group">
                <label for="articleContent">Content</label>
                <textarea id="articleContent" class="form-control" rows="10"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" id="cancelArticleModalBtn">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Article</button>
            </div>
        </form>
      </div>
    </div>
  `;

  // Inisialisasi Rich Text Editor (TinyMCE)
  // Pastikan Anda menambahkan script CDN di index.html admin
  if (window.tinymce) {
    tinymce.remove('#articleContent'); // Hapus instance lama jika ada
    tinymce.init({
        selector: '#articleContent',
        plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
        toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
        height: 400,
    });
  }


  const config = {
    endpoint: 'articles',
    containerId: 'articlesTable',
    renderFunction: renderArticles,
    searchPlaceholder: 'Search articles...'
  };

  loadPaginatedData(config);
  setupToolbarAndPaginationEvents(config);
  setupArticlesEventListeners();
}

function renderArticles(articles) {
  const tableBody = document.getElementById('articlesTable');
  tableBody.innerHTML = '';
  if (!articles || articles.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6">No articles found.</td></tr>`;
    return;
  }
  articles.forEach(article => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><img src="${article.thumbnail_url || 'https://via.placeholder.com/80x45'}" alt="${article.title}" style="width: 80px; height: 45px; object-fit: cover; border-radius: 4px;"></td>
      <td>${article.title}</td>
      <td>${article.author_name}</td>
      <td><span class="status-badge ${article.status === 'published' ? 'active' : 'inactive'}">${article.status}</span></td>
      <td>${new Date(article.created_at).toLocaleDateString('id-ID')}</td>
      <td class="action-buttons">
        <button class="action-btn edit" data-id="${article.id}"><i class="fas fa-edit"></i></button>
        <button class="action-btn delete" data-id="${article.id}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('#articlesTable .action-btn.edit').forEach(btn => {
    btn.addEventListener('click', e => editArticle(e.currentTarget.dataset.id));
  });
  document.querySelectorAll('#articlesTable .action-btn.delete').forEach(btn => {
    btn.addEventListener('click', e => {
      if (confirm('Are you sure you want to delete this article?')) {
        deleteArticle(e.currentTarget.dataset.id);
      }
    });
  });
}

function setupArticlesEventListeners() {
  const modal = document.getElementById('articleModal');
  const addBtn = document.getElementById('addArticleBtn');
  const closeBtn = document.getElementById('closeArticleModalBtn');
  const cancelBtn = document.getElementById('cancelArticleModalBtn');
  const form = document.getElementById('articleForm');
  
  let editingArticleId = null;

  addBtn.addEventListener('click', () => {
    editingArticleId = null;
    form.reset();
    tinymce.get('articleContent').setContent('');
    document.getElementById('articleModalTitle').textContent = 'Add New Article';
    modal.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => modal.style.display = 'none');
  cancelBtn.addEventListener('click', () => modal.style.display = 'none');
  window.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    tinymce.triggerSave(); // Penting: simpan konten dari TinyMCE ke textarea

    const formData = new FormData();
    formData.append('title', document.getElementById('articleTitle').value);
    formData.append('content', document.getElementById('articleContent').value);
    formData.append('author_name', document.getElementById('articleAuthor').value);
    formData.append('status', document.getElementById('articleStatus').value);
    const thumbnailFile = document.getElementById('articleThumbnail').files[0];
    if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

    const token = localStorage.getItem('adminToken');
    const url = editingArticleId ? `http://localhost:5000/api/admin/articles/${editingArticleId}` : 'http://localhost:5000/api/admin/articles';
    const method = editingArticleId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!response.ok) throw new Error(await response.text());
      alert('Article saved successfully!');
      modal.style.display = 'none';
      loadPageContent();
    } catch (err) {
      alert('Error saving article: ' + err.message);
    }
  });

  // Global function for edit button, karena renderArticles dipanggil ulang
  window.editArticle = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin/articles/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch article data');
      const article = await response.json();

      editingArticleId = id;
      document.getElementById('articleId').value = article.id;
      document.getElementById('articleTitle').value = article.title;
      document.getElementById('articleAuthor').value = article.author_name;
      document.getElementById('articleStatus').value = article.status;
      tinymce.get('articleContent').setContent(article.content || '');
      
      document.getElementById('articleModalTitle').textContent = 'Edit Article';
      modal.style.display = 'flex';
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  window.deleteArticle = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/admin/articles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete article');
      alert('Article deleted successfully!');
      loadPageContent();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
}

// // Placeholder function for viewing user balance history
// async function viewUserBalanceHistory(userId, username) {
//   alert(`Viewing balance history for user: ${username} (ID: ${userId}). This feature is not yet implemented.`);
//   // Implement API call and render history here if needed
//   // document.getElementById('balanceHistoryUsername').textContent = username;
//   // document.getElementById('userBalanceHistoryModal').style.display = 'flex';
// }

// ======================================================
// BARU: FUNGSI-FUNGSI GENERIK
// Tempatkan ini di bagian bawah file atau di area utility
// ======================================================

// BARU: Helper function to populate category dropdown for filters
async function populateFilterCategoriesDropdown() {
  const selectElement = document.getElementById('filterCategory');
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="all">All Categories</option>';
  try {
    const token = localStorage.getItem('adminToken');
    const response = await fetch('http://localhost:5000/api/admin/categories', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch categories for filter dropdown');
    const categoriesResponse = await response.json();
    const categories = categoriesResponse.data; // Asumsi API mengembalikan { data: [...] }
    if (categories && Array.isArray(categories)) {
      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        selectElement.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error populating filter categories dropdown:', error);
  }
}

async function populateFilterProductsDropdown() {
  const selectElement = document.getElementById('filterProduct');
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="all">All Products</option>';
  try {
    const token = localStorage.getItem('adminToken');
    // Ambil semua produk tanpa paginasi untuk dropdown
    const response = await fetch('http://localhost:5000/api/admin/products?limit=1000', { 
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch products for filter');
    const result = await response.json();
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = product.name;
        selectElement.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error populating filter products dropdown:', error);
  }
}

// BARU: Helper untuk mengambil dan mengisi dropdown Item Group untuk filter
async function populateFilterItemGroupsDropdown(productId) {
  const selectElement = document.getElementById('filterItemGroup');
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="all">All Item Groups</option>';

  // Hanya ambil grup jika produk sudah dipilih
  if (!productId || productId === 'all') {
    selectElement.disabled = true;
    return;
  }
  selectElement.disabled = false;

  try {
    const token = localStorage.getItem('adminToken');
    // Ambil grup item berdasarkan ID produk
    const response = await fetch(`http://localhost:5000/api/admin/item-groups?product_id=${productId}&limit=1000`, { 
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch item groups for filter');
    const result = await response.json();
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        selectElement.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error populating filter item groups dropdown:', error);
  }
}

// BARU: Fungsi untuk menginisialisasi dan mengatur event listener untuk modal filter
function setupFilterModalEvents(config) {
  const filterModal = document.getElementById('filterModal');
  const closeFilterModalBtn = document.getElementById('closeFilterModalBtn');
  const applyFilterBtn = document.getElementById('applyFilterBtn');
  const resetFilterBtn = document.getElementById('resetFilterBtn');
  const filterOptionsContainer = document.getElementById('filterOptionsContainer');

  if (!filterModal || !closeFilterModalBtn || !applyFilterBtn || !resetFilterBtn || !filterOptionsContainer) {
      console.error('Filter modal elements not found, skipping filter event setup.');
      return;
  }

  // Bersihkan opsi filter sebelumnya dan siapkan HTML dasar
  filterOptionsContainer.innerHTML = '';
  let filterHTML = '';

  // === Mulai Logika Dinamis untuk Konten Modal ===

  // Filter untuk 'categories'
  if (config.endpoint === 'categories') {
    filterHTML = `
      <div class="form-group">
          <label for="filterStatus">Filter by Status</label>
          <select id="filterStatus" class="form-control">
              <option value="all">All Statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
          </select>
      </div>
    `;
  }

  // Filter untuk 'products'
  if (config.endpoint === 'products') {
    filterHTML = `
      <div class="form-group">
        <label for="filterCategory">Filter by Category</label>
        <select id="filterCategory" class="form-control">
          <option value="all">All Categories</option>
        </select>
      </div>
      <div class="form-group">
        <label for="filterStatus">Filter by Status</label>
        <select id="filterStatus" class="form-control">
          <option value="all">All Statuses</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>
    `;
  }
  
  // Filter untuk 'item-groups'
  if (config.endpoint === 'item-groups') {
    filterHTML = `
      <div class="form-group">
        <label for="filterProduct">Filter by Product</label>
        <select id="filterProduct" class="form-control">
          <option value="all">All Products</option>
        </select>
      </div>
      <div class="form-group">
        <label for="filterStatus">Filter by Status</label>
        <select id="filterStatus" class="form-control">
          <option value="all">All Statuses</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>
    `;
  }

  // Filter untuk 'product-items'
  if (config.endpoint === 'product-items') {
    filterHTML = `
      <div class="form-group">
        <label for="filterProduct">Filter by Product</label>
        <select id="filterProduct" class="form-control">
          <option value="all">All Products</option>
        </select>
      </div>
      <div class="form-group">
        <label for="filterItemGroup">Filter by Item Group</label>
        <select id="filterItemGroup" class="form-control" disabled>
          <option value="all">All Item Groups</option>
        </select>
      </div>
      <div class="form-group">
        <label for="filterStatus">Filter by Status</label>
        <select id="filterStatus" class="form-control">
          <option value="all">All Statuses</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>
    `;
  }

  // Filter untuk 'users'
  if (config.endpoint === 'users') {
    filterHTML = `
      <div class="form-group">
          <label for="filterUserRole">Filter by Role</label>
          <select id="filterUserRole" class="form-control">
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
          </select>
      </div>
      <div class="form-group">
          <label for="filterStatus">Filter by Status</label>
          <select id="filterStatus" class="form-control">
              <option value="all">All Statuses</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
          </select>
      </div>
    `;
  }
  
  // === Selesai Logika Dinamis ===

  filterOptionsContainer.innerHTML = filterHTML;

  // Panggil fungsi untuk mengisi dropdown jika ada
  if (document.getElementById('filterCategory')) populateFilterCategoriesDropdown();
  if (document.getElementById('filterProduct')) populateFilterProductsDropdown();
  
  // Event listener untuk dropdown produk agar memicu dropdown grup item
  const productDropdown = document.getElementById('filterProduct');
  if (productDropdown) {
    productDropdown.addEventListener('change', (e) => {
        populateFilterItemGroupsDropdown(e.target.value);
    });
  }

  // Set nilai filter saat ini dari `tableState` ke elemen UI
  if (document.getElementById('filterStatus')) document.getElementById('filterStatus').value = tableState.filterStatus;
  if (document.getElementById('filterCategory')) document.getElementById('filterCategory').value = tableState.filterCategory;
  if (document.getElementById('filterProduct')) document.getElementById('filterProduct').value = tableState.filterProduct;
  if (document.getElementById('filterItemGroup')) {
      // Jika ada produk yang dipilih, panggil dropdown grup dan set nilainya
      if (tableState.filterProduct !== 'all') {
          populateFilterItemGroupsDropdown(tableState.filterProduct).then(() => {
              document.getElementById('filterItemGroup').value = tableState.filterItemGroup;
          });
      }
  }
  if (document.getElementById('filterUserRole')) document.getElementById('filterUserRole').value = tableState.filterRole;

  
  // Hapus event listener sebelumnya untuk menghindari duplikasi (penting!)
  const newApplyBtn = applyFilterBtn.cloneNode(true);
  applyFilterBtn.parentNode.replaceChild(newApplyBtn, applyFilterBtn);
  const newResetBtn = resetFilterBtn.cloneNode(true);
  resetFilterBtn.parentNode.replaceChild(newResetBtn, resetFilterBtn);
  
  closeFilterModalBtn.onclick = () => filterModal.style.display = 'none';

  newApplyBtn.onclick = () => {
    // Ambil nilai dari UI dan simpan ke `tableState`
    tableState.filterStatus = document.getElementById('filterStatus')?.value || 'all';
    tableState.filterCategory = document.getElementById('filterCategory')?.value || 'all';
    tableState.filterProduct = document.getElementById('filterProduct')?.value || 'all';
    tableState.filterItemGroup = document.getElementById('filterItemGroup')?.value || 'all';
    tableState.filterRole = document.getElementById('filterUserRole')?.value || 'all';
    
    tableState.currentPage = 1; // Reset ke halaman pertama
    loadPaginatedData(config); // Muat ulang data dengan filter baru
    filterModal.style.display = 'none';
  };

  newResetBtn.onclick = () => {
    // Reset state ke nilai default
    tableState.filterStatus = 'all';
    tableState.filterCategory = 'all';
    tableState.filterProduct = 'all';
    tableState.filterItemGroup = 'all';
    tableState.filterRole = 'all';

    tableState.currentPage = 1;
    loadPaginatedData(config);
    filterModal.style.display = 'none';
  };

  window.onclick = (event) => {
    if (event.target == filterModal) {
      filterModal.style.display = 'none';
    }
  };
}

// Fungsi generik untuk mengambil data dari backend
async function loadPaginatedData(config) {
  tableState.endpoint = config.endpoint;
  tableState.renderFunction = config.renderFunction;
  tableState.containerId = config.containerId;

  try {
    const token = localStorage.getItem('adminToken');
    // Untuk halaman transaksi, endpoint sudah berisi parameter filter
    const baseUrl = config.endpoint.startsWith('transactions') 
        ? `http://localhost:5000/api/admin/${tableState.endpoint}`
        : `http://localhost:5000/api/admin/${tableState.endpoint}`;
        
    const url = new URL(baseUrl);
    
    // Tambahkan parameter standar
    url.searchParams.append('page', tableState.currentPage);
    url.searchParams.append('limit', tableState.itemsPerPage);
    if (tableState.searchQuery) {
      url.searchParams.append('search', tableState.searchQuery);
    }

    // MODIFIKASI: Logika pengiriman filter yang disederhanakan dan diperbaiki
    // Logika ini sekarang berlaku untuk SEMUA halaman, termasuk Users.
    if (tableState.filterStatus && tableState.filterStatus !== 'all') {
      url.searchParams.append('status', tableState.filterStatus);
    }
    if (tableState.filterCategory && tableState.filterCategory !== 'all') {
      url.searchParams.append('category_id', tableState.filterCategory);
    }
    if (tableState.filterProduct && tableState.filterProduct !== 'all') {
      url.searchParams.append('product_id', tableState.filterProduct);
    }
    if (tableState.filterItemGroup && tableState.filterItemGroup !== 'all') {
      url.searchParams.append('item_group_id', tableState.filterItemGroup);
    }
    if (tableState.filterRole && tableState.filterRole !== 'all') {
      url.searchParams.append('role', tableState.filterRole);
    }
    // HAPUS: Blok 'if/else' yang rumit dan keliru untuk status user sudah dihilangkan.
    // Logika di atas sudah menangani semua kasus dengan benar.
    
    const response = await fetch(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error(`Failed to fetch ${config.endpoint}`);

    const result = await response.json();
    
    config.renderFunction(result.data);

    tableState.totalPages = result.total_pages;
    tableState.currentPage = result.current_page;
    renderPagination();

  } catch (err) {
    console.error(`Error loading data for ${config.endpoint}:`, err);
    const tableBody = document.getElementById(config.containerId);
    if(tableBody) tableBody.innerHTML = `<tr><td colspan="100%">Error: ${err.message}. Pastikan backend berjalan.</td></tr>`;
  }
}

// Fungsi generik untuk setup event listener toolbar dan paginasi
function setupToolbarAndPaginationEvents(config) {
    const entriesSelect = document.getElementById('entriesPerPage');
    const searchInput = document.getElementById('searchInput');
    const filterBtn = document.getElementById('filterBtn');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    // Set placeholder untuk search input
    if (searchInput && config.searchPlaceholder) {
        searchInput.placeholder = config.searchPlaceholder;
    }

    // Entries per page
    if(entriesSelect) {
        entriesSelect.value = tableState.itemsPerPage;
        entriesSelect.onchange = (e) => {
            tableState.itemsPerPage = parseInt(e.target.value);
            tableState.currentPage = 1;
            loadPaginatedData(config);
        };
    }
    
    // Search input
    if(searchInput) {
        let searchTimeout;
        searchInput.onkeyup = (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                tableState.searchQuery = e.target.value;
                tableState.currentPage = 1;
                loadPaginatedData(config);
            }, 500); // Debounce
        };
    }

    // Pagination buttons
    if(prevBtn) {
        prevBtn.onclick = () => {
            if (tableState.currentPage > 1) {
                tableState.currentPage--;
                loadPaginatedData(config);
            }
        };
    }
    if(nextBtn) {
        nextBtn.onclick = () => {
            if (tableState.currentPage < tableState.totalPages) {
                tableState.currentPage++;
                loadPaginatedData(config);
            }
        };
    }

     // MODIFIKASI: Event listener untuk tombol filter
  if (filterBtn) {
    filterBtn.onclick = null; // Hapus listener sebelumnya
    filterBtn.onclick = () => {
      // Tampilkan modal filter
      const filterModal = document.getElementById('filterModal');
      if (filterModal) {
        filterModal.style.display = 'flex';
        // Panggil setup untuk event modal filter setiap kali dibuka
        setupFilterModalEvents(config);
      }
    };
  }
}

// Fungsi generik untuk merender tombol-tombol paginasi
function renderPagination() {
  const pageNumbersContainer = document.getElementById('pageNumbers');
  if (!pageNumbersContainer) return;
  pageNumbersContainer.innerHTML = '';

  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  if(prevBtn) prevBtn.disabled = tableState.currentPage === 1;
  if(nextBtn) nextBtn.disabled = tableState.currentPage === tableState.totalPages || tableState.totalPages === 0;

  // Logika untuk menampilkan nomor halaman (bisa disesuaikan)
  for (let i = 1; i <= tableState.totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.classList.add('page-number-btn');
    if (i === tableState.currentPage) {
      pageBtn.classList.add('active');
    }
    pageBtn.onclick = () => {
      tableState.currentPage = i;
      loadPaginatedData({
          endpoint: tableState.endpoint,
          renderFunction: tableState.renderFunction,
          containerId: tableState.containerId,
          searchPlaceholder: document.getElementById('searchInput')?.placeholder
      });
    };
    pageNumbersContainer.appendChild(pageBtn);
  }
}


document.addEventListener('DOMContentLoaded', init); // Menjalankan fungsi init saat DOM sudah siap