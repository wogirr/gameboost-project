// KODE BARU: Isi untuk file artikel-detail.js

const IMG_BASE_URL = 'http://localhost:5000';
const API = window.GampangTopupAPI;

document.addEventListener('DOMContentLoaded', async () => {
    await loadSharedUI();
    await loadArticleDetail();
    // Kita juga bisa memuat item sidebar
    await loadSidebarContent();
});

async function loadSharedUI() {
  try {
    const response = await fetch('footer.html');
    const footerHTML = await response.text();
    const placeholder = document.getElementById('footer-placeholder');
    if (placeholder) placeholder.innerHTML = footerHTML;
  } catch (error) {
    console.error('Failed to load footer:', error);
  }
}

async function loadArticleDetail() {
    const contentArea = document.getElementById('article-detail-content');
    if (!contentArea) return;

    // Ambil 'slug' dari URL
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (!slug) {
        contentArea.innerHTML = '<p class="error">Artikel tidak ditemukan. URL tidak valid.</p>';
        return;
    }

    try {
        const article = await API.fetchArticleBySlug(slug);
        if (!article) {
            contentArea.innerHTML = '<p class="error">Artikel yang Anda cari tidak ditemukan.</p>';
            return;
        }

        // Update judul halaman
        document.title = `${article.title} - GAMPANGTOPUP`;

        const imageUrl = article.thumbnail_url ? `${IMG_BASE_URL}${article.thumbnail_url}` : '';
        const author = article.author_name || 'Redaksi';
        const publishedDate = new Date(article.created_at).toLocaleDateString('id-ID', {
            year: 'numeric', month: 'long', day: 'numeric'
        });

        contentArea.innerHTML = `
            <h1 class="article-title">${article.title}</h1>
            <div class="article-meta">
                <span>Oleh: ${author}</span> | <span>${publishedDate}</span>
            </div>
            ${imageUrl ? `<img src="${imageUrl}" alt="${article.title}" class="article-main-image">` : ''}
            <div class="article-body">
                ${article.content}
            </div>
        `;

    } catch (error) {
        console.error("Failed to load article detail:", error);
        contentArea.innerHTML = '<p class="error">Terjadi kesalahan saat memuat detail artikel.</p>';
    }
}

async function loadSidebarContent() {
    // Memuat artikel populer untuk sidebar
    const popularList = document.getElementById('popular-articles-list');
    if (popularList) {
        const popularArticles = await API.fetchLatestArticles(5); // Ambil 5 terbaru sebagai "populer"
        if (popularArticles && popularArticles.length > 0) {
            popularList.innerHTML = popularArticles.map(art => `
                <li><a href="artikel-detail.html?slug=${art.slug}">${art.title}</a></li>
            `).join('');
        }
    }

    // Memuat game populer untuk sidebar
    const gameList = document.getElementById('top-up-game-list');
    if (gameList) {
        const popularGames = await API.fetchPopularProducts(); // Gunakan API yang sudah ada
        if (popularGames && popularGames.length > 0) {
            gameList.innerHTML = popularGames.slice(0, 7).map(game => `
                <li><a href="topup.html?product_id=${game.id}">${game.name}</a></li>
            `).join('');
        }
    }
}