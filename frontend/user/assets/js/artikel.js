// KODE BARU: Isi untuk file artikel.js

// Konstanta global dari script.js
const IMG_BASE_URL = 'http://localhost:5000'; 
const API = window.GampangTopupAPI;

document.addEventListener('DOMContentLoaded', async () => {
    // Memuat komponen bersama seperti footer
    await loadSharedUI();
    // Memuat semua artikel
    await loadAllArticles();
});

    // === FUNGSI Hamburger ===
    const hamburger = document.querySelector('.hamburger-menu');
    const mainNav = document.querySelector('.main-nav');

    if (hamburger && mainNav) {
        hamburger.addEventListener('click', () => {
        mainNav.classList.toggle('active');
        hamburger.classList.toggle('active');
        });
    };

async function loadSharedUI() {
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

async function loadAllArticles() {
    const grid = document.getElementById('all-articles-grid');
    if (!grid) return;

    try {
        const articles = await API.fetchAllArticles();
        if (!articles || articles.length === 0) {
            grid.innerHTML = '<p>Belum ada artikel yang dipublikasikan.</p>';
            return;
        }

        grid.innerHTML = articles.map(article => {
            const imageUrl = article.thumbnail_url ? `${IMG_BASE_URL}${article.thumbnail_url}` : `${IMG_BASE_URL}/images/default-article.png`;
            const defaultImage = `${IMG_BASE_URL}/images/default-article.png`;
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

    } catch (error) {
        console.error("Failed to load articles:", error);
        grid.innerHTML = '<p class="error">Terjadi kesalahan saat memuat artikel.</p>';
    }
}