// KODE PERBAIKAN: Ganti seluruh isi file api.js dengan ini

// Base URL untuk server backend
const SERVER_BASE_URL = 'http://localhost:5000';

// URL spesifik untuk setiap modul API
const API_GAME_URL = `${SERVER_BASE_URL}/api/game`;
const API_ARTICLE_URL = `${SERVER_BASE_URL}/api/articles`; // <-- URL BARU UNTUK ARTIKEL

// Fungsi API sebagai objek global
const GampangTopupAPI = {
  async fetchCategories() {
    try {
      const response = await fetch(`${API_GAME_URL}/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return await response.json();
    } catch (error) {
      console.error("API Error - fetchCategories:", error);
      return [];
    }
  },

  async fetchPopularProducts() {
    try {
      const response = await fetch(`${API_GAME_URL}/products/popular`);
      if (!response.ok) throw new Error('Failed to fetch popular products');
      return await response.json();
    } catch (error) {
      console.error("API Error - fetchPopularProducts:", error);
      return [];
    }
  },

  async fetchProductsByCategory(categoryId) {
    try {
      const response = await fetch(`${API_GAME_URL}/products?categoryId=${categoryId}`);
      if (!response.ok) throw new Error(`Failed to fetch products for category ${categoryId}`);
      return await response.json();
    } catch (error) {
      console.error("API Error - fetchProductsByCategory:", error);
      return [];
    }
  },

  async fetchFlashSaleItems() {
    try {
      const response = await fetch(`${API_GAME_URL}/products/flash-sale`);
      if (!response.ok) throw new Error('Failed to fetch flash sale items');
      return await response.json();
    } catch (error) {
      console.error("API Error - fetchFlashSaleItems:", error);
      return [];
    }
  },

  async searchProducts(query) {
    try {
      const response = await fetch(`${API_GAME_URL}/products/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search products');
      return await response.json();
    } catch (error) {
      console.error("API Error - searchProducts:", error);
      return [];
    }
  },

  // --- FUNGSI-FUNGSI BARU DAN YANG DIPERBAIKI UNTUK ARTIKEL ---
  
  async fetchLatestArticles(limit = 3) {
    try {
      // PERBAIKAN: Menggunakan API_ARTICLE_URL yang benar
      const response = await fetch(`${API_ARTICLE_URL}/latest?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch latest articles');
      return await response.json();
    } catch (error) {
      console.error("API Error - fetchLatestArticles:", error);
      return [];
    }
  },

  async fetchAllArticles() {
    try {
      const response = await fetch(`${API_ARTICLE_URL}/`);
      if (!response.ok) throw new Error('Failed to fetch all articles');
      return await response.json();
    } catch (error) {
      console.error("API Error - fetchAllArticles:", error);
      return [];
    }
  },

  async fetchArticleBySlug(slug) {
    try {
      const response = await fetch(`${API_ARTICLE_URL}/${slug}`);
      if (!response.ok) throw new Error('Failed to fetch article by slug');
      return await response.json();
    } catch (error) {
      console.error("API Error - fetchArticleBySlug:", error);
      return null; // Kembalikan null jika gagal
    }
  },
};

// Export sebagai objek global
window.GampangTopupAPI = GampangTopupAPI;