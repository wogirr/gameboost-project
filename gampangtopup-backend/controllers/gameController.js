const db = require('../config/db');

// ==================== FUNGSI KATEGORI ====================
const getCategories = async (req, res) => {
  try {
    // Perbaikan: Gunakan query yang lebih aman dan valid
    const [categories] = await db.query(`
      SELECT id, name, icon_class 
      FROM categories 
      WHERE status = 1 
      ORDER BY id ASC
    `);
    
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// ==================== FUNGSI PRODUK POPULER ====================
const getPopularProducts = async (req, res) => {
  try {
    // Perbaikan: Pastikan kolom yang direferensi ada di tabel
    const [products] = await db.query(`
      SELECT id, name, logo_url 
      FROM products 
      WHERE status = 1 AND is_popular = 1
      ORDER BY id ASC
    `);
    
    res.status(200).json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// ==================== FUNGSI PRODUK ====================
const getProducts = async (req, res) => {
  try {
    const { categoryId } = req.query;
    let sql = `
      SELECT p.id, p.name, p.logo_url, c.name AS category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.status = 1
    `;
    
    const params = [];
    if (categoryId) {
      sql += " AND p.category_id = ?";
      params.push(categoryId);
    }
    
    sql += " ORDER BY p.sort_order ASC";
    
    const [products] = await db.query(sql, params);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// ==================== FUNGSI FLASH SALE ====================
const getFlashSaleItems = async (req, res) => {
  try {
    // Perbaikan query: pastikan flash_sale = 1
    const [items] = await db.query(`
      SELECT 
        pi.id, 
        pi.name,
        pi.base_price,
        pi.selling_price,
        pi.icon_url,
        p.name AS product_name,
        p.id AS product_id
      FROM product_items pi
      JOIN item_groups ig ON pi.item_group_id = ig.id
      JOIN products p ON ig.product_id = p.id
      WHERE pi.flash_sale = 1
        AND pi.status = 1
        AND p.status = 1
      ORDER BY pi.selling_price ASC
      LIMIT 10
    `);
    
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};

// ==================== FUNGSI PRODUK DETAILS ====================
const getProductDetails = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Ambil detail produk utama
    const [productResult] = await db.query(
      `SELECT id, name, description, banner_url, logo_url, input_type, server_options 
       FROM products 
       WHERE id = ? AND status = 1`,
      [id]
    );

    if (productResult.length === 0) {
      return res.status(404).json({ error: 'Product not found or not active.' });
    }
    const product = productResult[0];

    // 2. Ambil semua item produk dan grupnya yang terkait
    const [itemsResult] = await db.query(
      `SELECT 
         pi.id, pi.name, pi.selling_price, pi.base_price, pi.discount_percentage, pi.flash_sale, pi.icon_url,
         ig.id AS group_id, ig.name AS group_name, ig.sort_order
       FROM product_items pi
       JOIN item_groups ig ON pi.item_group_id = ig.id
       WHERE ig.product_id = ? AND pi.status = 1 AND ig.status = 1
       ORDER BY ig.sort_order ASC, pi.selling_price ASC`,
      [id]
    );

    // 3. Susun data menjadi struktur JSON yang terorganisir
    const itemGroups = {};
    itemsResult.forEach(item => {
      // Jika grup belum ada di objek, buat entri baru
      if (!itemGroups[item.group_id]) {
        itemGroups[item.group_id] = {
          id: item.group_id,
          name: item.group_name,
          items: []
        };
      }
      // Tambahkan item ke grup yang sesuai
      itemGroups[item.group_id].items.push({
        id: item.id,
        name: item.name,
        selling_price: item.selling_price,
        base_price: item.base_price,
        discount_percentage: item.discount_percentage,
        flash_sale: item.flash_sale,
        icon_url: item.icon_url
      });
    });

    // 4. Gabungkan detail produk dengan grup item yang sudah disusun
    const responseData = {
      ...product,
      // Ubah server_options dari string JSON menjadi objek JSON jika ada
      server_options: product.server_options ? JSON.parse(product.server_options) : null,
      // Ubah objek itemGroups menjadi array
      item_groups: Object.values(itemGroups)
    };

    res.json(responseData);

  } catch (err) {
    console.error('Error fetching product details:', err);
    // Cek jika error karena JSON tidak valid
    if (err instanceof SyntaxError) {
        return res.status(500).json({ error: 'Server error: Invalid JSON format in server_options.' });
    }
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// ==================== FUNGSI SEARCH GAME ====================
const searchProducts = async (req, res) => {
  // 1. Ambil query pencarian dari URL (?query=...)
  const { query } = req.query;

  // 2. Validasi: jika tidak ada query, kirim error
  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    // 3. Buat query SQL untuk mencari produk yang namanya mirip
    // Tanda '%' adalah wildcard, artinya "cocok dengan karakter apa pun"
    // Jadi, 'pubg' akan cocok dengan 'PUBG Mobile', 'Game PUBG', dll.
    const searchQuery = `
      SELECT 
        p.id, 
        p.name, 
        p.logo_url,
        c.name as category_name
      FROM 
        products p
      LEFT JOIN 
        categories c ON p.category_id = c.id
      WHERE 
        p.name LIKE ? 
      LIMIT 15; -- Batasi hasil agar tidak terlalu banyak
    `;

    // 4. Eksekusi query ke database
    const [results] = await db.query(searchQuery, [`%${query}%`]);

    // 5. Kirim hasil dalam format JSON ke frontend
    res.json(results);

  } catch (error) {
    // 6. Jika terjadi error di server atau database
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  getCategories,
  getProducts,
  getFlashSaleItems,
  getPopularProducts,
  getProductDetails,
  searchProducts
};