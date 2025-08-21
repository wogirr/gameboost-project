const db = require('../config/db');
const fs = require('fs'); // Import module 'fs' untuk operasi file (menghapus file)
const path = require('path'); // Import module 'path' untuk bekerja dengan jalur file

// Helper function to get full image URL
// Pindahkan fungsi ini ke sini, di luar module.exports
const getFullImageUrl = (req, relativePath) => {
    if (!relativePath) return null;
    // Jika path sudah URL penuh (misal dari eksternal), gunakan itu
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    // Jika path relatif, buat URL penuh
    return `${req.protocol}://${req.get('host')}${relativePath}`;
  };

module.exports = {
  getDashboardStats: async (req, res) => {
        try {
          // 1. Total Transactions
          // Menghitung total transaksi dari tabel 'transactions'
          const [totalTransactionsResult] = await db.query(
            `SELECT COUNT(id) AS total_transactions FROM transactions`
          );
          const totalTransactions = totalTransactionsResult[0].total_transactions || 0;
      
          // 2. Today's Income, Daily Profit, & Problem Transactions (Today)
          // Mengambil data untuk hari ini: pendapatan, keuntungan, dan transaksi bermasalah
          // Profit dihitung dari (total_price - base_price) untuk setiap transaksi sukses.
          const today = new Date().toISOString().slice(0, 10); // Format YYYY-MM-DD
          const [dailyStatsResult] = await db.query(
            `SELECT
               SUM(CASE WHEN t.status = 'SUCCESS' THEN t.total_price ELSE 0 END) AS today_income,
               SUM(CASE WHEN t.status = 'SUCCESS' THEN (t.total_price - pi.base_price) ELSE 0 END) AS daily_profit,
               COUNT(CASE WHEN t.status IN ('FAILED', 'REFUNDED') THEN t.id ELSE NULL END) AS problem_transactions_count
             FROM transactions t
             JOIN product_items pi ON t.product_item_id = pi.id -- Join untuk mendapatkan base_price
             WHERE DATE(t.transaction_date) = ?`,
            [today]
          );
          const todayIncome = dailyStatsResult[0].today_income || 0;
          const dailyProfit = dailyStatsResult[0].daily_profit || 0;
          const problemTransactions = dailyStatsResult[0].problem_transactions_count || 0;
      
          // 3. Monthly Transaction Statistics
          // Statistik transaksi, income, dan profit per bulan
          const [monthlyStats] = await db.query(`
            SELECT
              DATE_FORMAT(t.transaction_date, '%Y-%m') AS month,
              COUNT(t.id) AS totalTransactions,
              SUM(CASE WHEN t.status = 'SUCCESS' THEN t.total_price ELSE 0 END) AS totalIncome,
              SUM(CASE WHEN t.status = 'SUCCESS' THEN (t.total_price - pi.base_price) ELSE 0 END) AS totalProfit -- Profit per bulan
            FROM transactions t
            JOIN product_items pi ON t.product_item_id = pi.id -- Join untuk mendapatkan base_price
            GROUP BY month
            ORDER BY month ASC
          `);
      
          // 4. Top 5 Users by Balance
          // Mengambil 5 user dengan saldo Gampang Coin terbanyak
          // Menggunakan `user.gampang_coin_balance` dari `authController.js`
          const [topUsers] = await db.query(`
            SELECT id, username, gampang_coin_balance AS balance
            FROM users
            ORDER BY gampang_coin_balance DESC
            LIMIT 5
          `);
      
          // 5. Top 5 Categories by Transaction Count
          // Mengambil 5 kategori dengan jumlah transaksi sukses terbanyak
          const [topCategories] = await db.query(`
            SELECT
              c.id, c.name,
              COUNT(t.id) AS transactionCount
            FROM categories c
            JOIN products p ON p.category_id = c.id
            JOIN product_items pi ON pi.item_group_id = p.id
            JOIN transactions t ON t.product_item_id = pi.id
            WHERE t.status = 'SUCCESS' -- Hanya hitung transaksi yang sukses
            GROUP BY c.id, c.name
            ORDER BY transactionCount DESC
            LIMIT 5
          `);
      
          // 6. Top 5 Products by Sales Volume
          // Mengambil 5 produk dengan jumlah penjualan (transaksi sukses) terbanyak
          const [topProducts] = await db.query(`
            SELECT
              p.id, p.name,
              COUNT(t.id) AS salesCount
            FROM products p
            JOIN product_items pi ON pi.item_group_id = p.id
            JOIN transactions t ON t.product_item_id = pi.id
            WHERE t.status = 'SUCCESS' -- Hanya hitung penjualan dari transaksi yang sukses
            GROUP BY p.id, p.name
            ORDER BY salesCount DESC
            LIMIT 5
          `);
      
          // Mengirim semua data statistik sebagai respons JSON
          res.json({
            totalTransactions,
            todayIncome,
            dailyProfit,
            problemTransactions,
            monthlyStats,
            topUsers,
            topCategories,
            topProducts,
          });
      
        } catch (err) {
          console.error('Error fetching dashboard stats:', err);
          res.status(500).json({ error: err.message });
        }
    },
    
  // ===== Categories =====
  getAllCategories: async (req, res) => {
    try {
      // MODIFIKASI: Ambil parameter filter dari query string
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search ? `%${req.query.search}%` : '%';
      const status = req.query.status; // BARU: Ambil status filter
      const offset = (page - 1) * limit;

      let whereClauses = ['name LIKE ?'];
      let queryParams = [search];

      // BARU: Tambahkan filter status jika ada
      if (status && (status === '1' || status === '0')) {
        whereClauses.push('status = ?');
        queryParams.push(status);
      }

      const whereString = `WHERE ${whereClauses.join(' AND ')}`;

      // BARU: Query untuk menghitung total data yang cocok dengan filter
      const countQuery = `SELECT COUNT(id) AS total FROM categories ${whereString}`;
      const [totalResult] = await db.query(countQuery, queryParams);
      const totalItems = totalResult[0].total;
      const totalPages = Math.ceil(totalItems / limit);

      // BARU: Query untuk mengambil data dengan paginasi, pencarian, dan filter
      const dataQuery = `SELECT * FROM categories ${whereString} ORDER BY name ASC LIMIT ? OFFSET ?`;
      const [categories] = await db.query(dataQuery, [...queryParams, limit, offset]);
      
      res.json({
        data: categories,
        total_pages: totalPages,
        current_page: page,
        total_items: totalItems
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createCategory: async (req, res) => {
    const { name, icon_class, status } = req.body;
    try {
      const [result] = await db.query(
        'INSERT INTO categories (name, icon_class, status) VALUES (?, ?, ?)',
        [name, icon_class, status]
      );
      res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

// Di fungsi updateCategory
  updateCategory: async (req, res) => {
    const { id } = req.params;
    const { name, icon_class, status } = req.body;
    
    try {
      // Perbaikan: Gunakan parameterized query untuk menghindari SQL injection
      await db.query(
        'UPDATE categories SET name = ?, icon_class = ?, status = ? WHERE id = ?',
        [name, icon_class, status, id]
      );
      
      // Perbaikan: Kirim data yang diupdate sebagai response
      const [updatedCategory] = await db.query(
        'SELECT * FROM categories WHERE id = ?', 
        [id]
      );
      
      if (updatedCategory.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      // Kirim data lengkap sebagai response
      res.json(updatedCategory[0]);
    } catch (err) {
      console.error('Update category error:', err);
      res.status(500).json({ error: err.message });
    }
  },
  
  // Di fungsi getCategory (tambahkan fungsi ini)
  getCategoryById: async (req, res) => {
    const { id } = req.params;
    
    try {
      const [categories] = await db.query(
        'SELECT * FROM categories WHERE id = ?', 
        [id]
      );
      
      if (categories.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      res.json(categories[0]);
    } catch (err) {
      console.error('Get category error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  deleteCategory: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query('DELETE FROM categories WHERE id = ?', [id]);
      res.json({ message: 'Category deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // ===== Item Groups =====
  getAllItemGroups: async (req, res) => {
    try {
        // MODIFIKASI: Tambahkan logika filter
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search ? `%${req.query.search}%` : '%';
        const productId = req.query.product_id; // BARU: Filter by product ID
        const status = req.query.status;        // BARU: Filter by status
        const offset = (page - 1) * limit;
  
        let whereClauses = ['(ig.name LIKE ? OR p.name LIKE ?)'];
        let queryParams = [search, search];

        // BARU: Tambahkan filter jika ada
        if (productId && productId !== 'all') {
            whereClauses.push('ig.product_id = ?');
            queryParams.push(productId);
        }
        if (status && (status === '1' || status === '0')) {
            whereClauses.push('ig.status = ?');
            queryParams.push(status);
        }
  
        const whereString = `WHERE ${whereClauses.join(' AND ')}`;

        const countQuery = `SELECT COUNT(ig.id) AS total FROM item_groups ig JOIN products p ON ig.product_id = p.id ${whereString}`;
        const [totalResult] = await db.query(countQuery, queryParams);
        const totalItems = totalResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);
  
        const dataQuery = `
          SELECT ig.*, p.name AS product_name 
          FROM item_groups ig
          JOIN products p ON ig.product_id = p.id
          ${whereString}
          ORDER BY p.name ASC, ig.sort_order ASC
          LIMIT ? OFFSET ?`;
        const [itemGroups] = await db.query(dataQuery, [...queryParams, limit, offset]);
  
        res.json({
          data: itemGroups,
          total_pages: totalPages,
          current_page: page,
          total_items: totalItems,
        });
      } catch (err) {
        console.error('Error fetching item groups:', err);
        res.status(500).json({ error: err.message });
      }
  },

  getItemGroupById : async (req, res) => {
    try {
        const [itemGroup] = await db.query('SELECT * FROM item_groups WHERE id = ?', [req.params.id]);
        if (itemGroup.length === 0) {
          return res.status(404).json({ error: 'Item Group not found' });
        }
        res.json(itemGroup[0]);
      } catch (err) {
        console.error('Error fetching item group by ID:', err);
        res.status(500).json({ error: err.message });
      }
  },

  createItemGroup: async (req, res) => {
    const { product_id, name, sort_order, status } = req.body;
    try {
      const [result] = await db.query(
        'INSERT INTO item_groups (product_id, name, sort_order, status) VALUES (?, ?, ?, ?)',
        [product_id, name, sort_order, status]
      );
      res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
      console.error('Error creating item group:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateItemGroup: async (req, res) => {
    const { id } = req.params;
    const { product_id, name, sort_order, status } = req.body;
    try {
      await db.query(
        'UPDATE item_groups SET product_id = ?, name = ?, sort_order = ?, status = ? WHERE id = ?',
        [product_id, name, sort_order, status, id]
      );
      res.json({ message: 'Item group updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  deleteItemGroup: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query('DELETE FROM item_groups WHERE id = ?', [id]);
      res.json({ message: 'Item group deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // ===== Products =====

  getAllProducts: async (req, res) => {
    try {
        // MODIFIKASI: Tambahkan logika filter
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search ? `%${req.query.search}%` : '%';
        const categoryId = req.query.category_id; // BARU: Filter by category ID
        const status = req.query.status;         // BARU: Filter by status
        const offset = (page - 1) * limit;
  
        let whereClauses = ['(p.name LIKE ? OR c.name LIKE ?)'];
        let queryParams = [search, search];

        // BARU: Tambahkan filter jika ada
        if (categoryId && categoryId !== 'all') {
            whereClauses.push('p.category_id = ?');
            queryParams.push(categoryId);
        }
        if (status && (status === '1' || status === '0')) {
            whereClauses.push('p.status = ?');
            queryParams.push(status);
        }

        const whereString = `WHERE ${whereClauses.join(' AND ')}`;
  
        const countQuery = `SELECT COUNT(p.id) AS total FROM products p JOIN categories c ON p.category_id = c.id ${whereString}`;
        const [totalResult] = await db.query(countQuery, queryParams);
        const totalItems = totalResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);
  
        const dataQuery = `
          SELECT
            p.id, p.name, p.category_id, p.description, p.input_type,
            p.needs_player_check, p.is_popular, p.sort_order,
            p.logo_url, p.banner_url, p.status,
            c.name AS category_name
          FROM products p
          JOIN categories c ON p.category_id = c.id
          ${whereString}
          ORDER BY p.id DESC, p.sort_order ASC
          LIMIT ? OFFSET ?`;
        const [products] = await db.query(dataQuery, [...queryParams, limit, offset]);
  
        const productsWithFullUrls = products.map(product => ({
          ...product,
          logo_url: getFullImageUrl(req, product.logo_url),
          banner_url: getFullImageUrl(req, product.banner_url)
        }));
  
        res.json({
          data: productsWithFullUrls,
          total_pages: totalPages,
          current_page: page,
          total_items: totalItems,
        });
      } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: err.message });
      }
    },

  // Di fungsi getCategory (tambahkan fungsi ini)
  getProductById: async (req, res) => {
    try {
        const [product] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // Tambahkan URL lengkap untuk gambar saat mengambil produk tunggal
        const productWithFullUrls = {
            ...product[0],
            logo_url: getFullImageUrl(req, product[0].logo_url),
            banner_url: getFullImageUrl(req, product[0].banner_url)
        };
        res.json(productWithFullUrls);
        } catch (err) {
        console.error('Error fetching product by ID:', err);
        res.status(500).json({ error: err.message });
        }
    },

  createProduct: async (req, res) => {
    try {
        const {
          name, category_id, description, input_type,
          // MODIFIKASI: Tambahkan server_options di sini
          server_options,
          needs_player_check, is_popular, sort_order, status
        } = req.body;
    
        // Ambil path file yang diupload oleh Multer
        let logo_url = null;
        let banner_url = null;
    
        if (req.files) {
          if (req.files.logo && req.files.logo.length > 0) {
            logo_url = `/images/${req.files.logo[0].filename}`;
          }
          if (req.files.banner && req.files.banner.length > 0) {
            banner_url = `/images/${req.files.banner[0].filename}`;
          }
        }
    
        // MODIFIKASI: Pastikan server_options disimpan sebagai NULL jika kosong
        const finalServerOptions = server_options || null;

        const [result] = await db.query(
          `INSERT INTO products (name, category_id, description, input_type, server_options,
                                needs_player_check, is_popular, sort_order, logo_url, banner_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [name, category_id, description, input_type, finalServerOptions,
            needs_player_check, is_popular, sort_order, logo_url, banner_url, status]
        );
        res.status(201).json({ message: 'Product created successfully', productId: result.insertId });
      } catch (err) {
        console.error('Error creating product:', err);
        // Hapus file yang sudah terupload jika ada error database
        if (req.files) {
          if (req.files.logo && req.files.logo.length > 0) {
            fs.unlink(req.files.logo[0].path, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting uploaded logo:', unlinkErr);
            });
          }
          if (req.files.banner && req.files.banner.length > 0) {
            fs.unlink(req.files.banner[0].path, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting uploaded banner:', unlinkErr);
            });
          }
        }
        res.status(500).json({ error: err.message });
      }
    },

  updateProduct : async (req, res) => {
    try {
        const {
          name, category_id, description, input_type,
          // MODIFIKASI: Tambahkan server_options di sini
          server_options,
          needs_player_check, is_popular, sort_order, status
        } = req.body;
    
        const productId = req.params.id;
    
        const [oldProductResult] = await db.query('SELECT logo_url, banner_url FROM products WHERE id = ?', [productId]);
        const oldProduct = oldProductResult[0];
    
        let logo_url = oldProduct ? oldProduct.logo_url : null;
        let banner_url = oldProduct ? oldProduct.banner_url : null;
    
        if (req.files && req.files.logo && req.files.logo.length > 0) {
          if (oldProduct && oldProduct.logo_url && !oldProduct.logo_url.startsWith('http')) {
            const oldLogoPath = path.join(__dirname, '../', oldProduct.logo_url);
            fs.unlink(oldLogoPath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting old logo:', unlinkErr);
            });
          }
          logo_url = `/images/${req.files.logo[0].filename}`;
        } else if (req.body.logo_url === '') {
            if (oldProduct && oldProduct.logo_url && !oldProduct.logo_url.startsWith('http')) {
                const oldLogoPath = path.join(__dirname, '../', oldProduct.logo_url);
                fs.unlink(oldLogoPath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting old logo:', unlinkErr);
                });
            }
            logo_url = null;
        }
    
        if (req.files && req.files.banner && req.files.banner.length > 0) {
          if (oldProduct && oldProduct.banner_url && !oldProduct.banner_url.startsWith('http')) {
            const oldBannerPath = path.join(__dirname, '../', oldProduct.banner_url);
            fs.unlink(oldBannerPath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting old banner:', unlinkErr);
            });
          }
          banner_url = `/images/${req.files.banner[0].filename}`;
        } else if (req.body.banner_url === '') {
            if (oldProduct && oldProduct.banner_url && !oldProduct.banner_url.startsWith('http')) {
                const oldBannerPath = path.join(__dirname, '../', oldProduct.banner_url);
                fs.unlink(oldBannerPath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting old banner:', unlinkErr);
                });
            }
            banner_url = null;
        }
    
        // MODIFIKASI: Pastikan server_options disimpan sebagai NULL jika kosong
        const finalServerOptions = server_options || null;

        const [result] = await db.query(
          `UPDATE products SET
              name = ?, category_id = ?, description = ?, input_type = ?, server_options = ?,
              needs_player_check = ?, is_popular = ?, sort_order = ?, logo_url = ?, banner_url = ?, status = ?
            WHERE id = ?`,
          [name, category_id, description, input_type, finalServerOptions,
            needs_player_check, is_popular, sort_order, logo_url, banner_url, status, productId]
        );
    
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product updated successfully' });
      } catch (err) {
        console.error('Error updating product:', err);
        // Hapus file yang baru diupload jika ada error
        if (req.files) {
          if (req.files.logo && req.files.logo.length > 0) {
            fs.unlink(req.files.logo[0].path, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting newly uploaded logo on update error:', unlinkErr);
            });
          }
          if (req.files.banner && req.files.banner.length > 0) {
            fs.unlink(req.files.banner[0].path, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting newly uploaded banner on update error:', unlinkErr);
            });
          }
        }
        res.status(500).json({ error: err.message });
      }
    },

  deleteProduct: async (req, res) => {
    try {
        const productId = req.params.id;
    
        // Ambil path gambar dari database sebelum menghapus produk
        const [productResult] = await db.query('SELECT logo_url, banner_url FROM products WHERE id = ?', [productId]);
        const productToDelete = productResult[0];
    
        const [result] = await db.query('DELETE FROM products WHERE id = ?', [productId]);
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Product not found' });
        }
    
        // Hapus file gambar dari server setelah sukses menghapus dari database
        if (productToDelete) {
          if (productToDelete.logo_url && !productToDelete.logo_url.startsWith('http')) {
            const logoPath = path.join(__dirname, '../', productToDelete.logo_url);
            fs.unlink(logoPath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting logo file:', unlinkErr);
            });
          }
          if (productToDelete.banner_url && !productToDelete.banner_url.startsWith('http')) {
            const bannerPath = path.join(__dirname, '../', productToDelete.banner_url);
            fs.unlink(bannerPath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting banner file:', unlinkErr);
            });
          }
        }
    
        res.json({ message: 'Product deleted successfully' });
      } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: err.message });
      }
    },

  // ===== Product Items =====
  getAllProductItems: async (req, res) => {
    try {
        // MODIFIKASI: Tambahkan logika filter yang lebih spesifik
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search ? `%${req.query.search}%` : '%';
        const productId = req.query.product_id;         // BARU: Filter by product
        const itemGroupId = req.query.item_group_id;     // BARU: Filter by item group
        const status = req.query.status;                 // BARU: Filter by status
        const offset = (page - 1) * limit;
  
        let whereClauses = ['(pi.name LIKE ? OR p.name LIKE ? OR ig.name LIKE ? OR pi.product_code LIKE ?)'];
        let searchParams = [search, search, search, search];

        // BARU: Tambahkan filter jika ada
        if (productId && productId !== 'all') {
            whereClauses.push('p.id = ?');
            searchParams.push(productId);
        }
        if (itemGroupId && itemGroupId !== 'all') {
            whereClauses.push('pi.item_group_id = ?');
            searchParams.push(itemGroupId);
        }
        if (status && (status === '1' || status === '0')) {
            whereClauses.push('pi.status = ?');
            searchParams.push(status);
        }

        const whereString = `WHERE ${whereClauses.join(' AND ')}`;
  
        const countQuery = `
          SELECT COUNT(pi.id) AS total 
          FROM product_items pi
          JOIN item_groups ig ON pi.item_group_id = ig.id
          JOIN products p ON ig.product_id = p.id
          ${whereString}`;
        const [totalResult] = await db.query(countQuery, searchParams);
        const totalItems = totalResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);
  
        const dataQuery = `
          SELECT
            pi.id, pi.item_group_id, pi.name, pi.product_code, pi.base_price,
            pi.selling_price, pi.discount_percentage, pi.flash_sale, pi.status, pi.icon_url,
            ig.name AS group_name,
            p.name AS product_name
          FROM product_items pi
          JOIN item_groups ig ON pi.item_group_id = ig.id
          JOIN products p ON ig.product_id = p.id
          ${whereString}
          ORDER BY p.name ASC, ig.name ASC, pi.name ASC
          LIMIT ? OFFSET ?`;
        const [productItems] = await db.query(dataQuery, [...searchParams, limit, offset]);
      
        const itemsWithFullUrls = productItems.map(item => ({
          ...item,
          icon_url: getFullImageUrl(req, item.icon_url)
        }));
      
        res.json({
          data: itemsWithFullUrls,
          total_pages: totalPages,
          current_page: page,
          total_items: totalItems,
        });
      } catch (err) {
        console.error('Error fetching product items:', err);
        res.status(500).json({ error: err.message });
      }
  },

  getProductItemById : async (req, res) => {
    try {
        const [productItem] = await db.query('SELECT * FROM product_items WHERE id = ?', [req.params.id]);
        if (productItem.length === 0) {
          return res.status(404).json({ error: 'Product Item not found' });
        }
        // Tambahkan URL lengkap untuk ikon saat mengambil item produk tunggal
        const itemWithFullUrl = {
          ...productItem[0],
          icon_url: getFullImageUrl(req, productItem[0].icon_url)
        };
        res.json(itemWithFullUrl);
      } catch (err) {
        console.error('Error fetching product item by ID:', err);
        res.status(500).json({ error: err.message });
      }
  },

  createProductItem: async (req, res) => {
    try {
        const {
          item_group_id, name, product_code, base_price,
          selling_price, discount_percentage, flash_sale, status
        } = req.body;
    
        // Ambil path file icon yang diupload oleh Multer
        let icon_url = null;
        if (req.files && req.files.icon && req.files.icon.length > 0) {
          icon_url = `/images/${req.files.icon[0].filename}`; // 'images' adalah folder penyimpanan
        }
    
        const [result] = await db.query(
          `INSERT INTO product_items (item_group_id, name, product_code, base_price,
                                      selling_price, discount_percentage, flash_sale, status, icon_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [item_group_id, name, product_code, base_price,
           selling_price, discount_percentage, flash_sale, status, icon_url]
        );
        res.status(201).json({ message: 'Product Item created successfully', productItemId: result.insertId });
      } catch (err) {
        console.error('Error creating product item:', err);
        // Hapus file yang sudah terupload jika ada error database
        if (req.files && req.files.icon && req.files.icon.length > 0) {
          fs.unlink(req.files.icon[0].path, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting uploaded icon:', unlinkErr);
          });
        }
        res.status(500).json({ error: err.message });
      }
  },

  updateProductItem: async (req, res) => {
    try {
        const {
          item_group_id, name, product_code, base_price,
          selling_price, discount_percentage, flash_sale, status
        } = req.body;
    
        const productItemId = req.params.id;
    
        // Ambil data item lama untuk menghapus file lama jika ada yang baru diupload
        const [oldItemResult] = await db.query('SELECT icon_url FROM product_items WHERE id = ?', [productItemId]);
        const oldItem = oldItemResult[0];
    
        let icon_url = oldItem ? oldItem.icon_url : null;
    
        // Cek apakah ada file icon baru diupload
        if (req.files && req.files.icon && req.files.icon.length > 0) {
          // Hapus file icon lama jika ada dan bukan URL eksternal
          if (oldItem && oldItem.icon_url && !oldItem.icon_url.startsWith('http')) {
            const oldIconPath = path.join(__dirname, '../', oldItem.icon_url);
            fs.unlink(oldIconPath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting old icon:', unlinkErr);
            });
          }
          icon_url = `/images/${req.files.icon[0].filename}`; // Gunakan path file baru
        } else if (req.body.icon_url === '') { // Jika icon_url dikosongkan dari frontend
            if (oldItem && oldItem.icon_url && !oldItem.icon_url.startsWith('http')) {
                const oldIconPath = path.join(__dirname, '../', oldItem.icon_url);
                fs.unlink(oldIconPath, (unlinkErr) => {
                    if (unlinkErr) console.error('Error deleting old icon:', unlinkErr);
                });
            }
            icon_url = null;
        }
    
    
        const [result] = await db.query(
          `UPDATE product_items SET
             item_group_id = ?, name = ?, product_code = ?, base_price = ?,
             selling_price = ?, discount_percentage = ?, flash_sale = ?, status = ?, icon_url = ?
           WHERE id = ?`,
          [item_group_id, name, product_code, base_price,
           selling_price, discount_percentage, flash_sale, status, icon_url, productItemId]
        );
    
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Product Item not found' });
        }
        res.json({ message: 'Product Item updated successfully' });
      } catch (err) {
        console.error('Error updating product item:', err);
        // Hapus file yang baru diupload jika ada error database saat update
        if (req.files && req.files.icon && req.files.icon.length > 0) {
          fs.unlink(req.files.icon[0].path, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting newly uploaded icon on update error:', unlinkErr);
          });
        }
        res.status(500).json({ error: err.message });
      }
  },

  deleteProductItem: async (req, res) => {
    try {
        const productItemId = req.params.id;
    
        // Ambil path ikon dari database sebelum menghapus item produk
        const [itemResult] = await db.query('SELECT icon_url FROM product_items WHERE id = ?', [productItemId]);
        const itemToDelete = itemResult[0];
    
        const [result] = await db.query('DELETE FROM product_items WHERE id = ?', [productItemId]);
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Product Item not found' });
        }
    
        // Hapus file ikon dari server setelah sukses menghapus dari database
        if (itemToDelete && itemToDelete.icon_url && !itemToDelete.icon_url.startsWith('http')) {
          const iconPath = path.join(__dirname, '../', itemToDelete.icon_url);
          fs.unlink(iconPath, (unlinkErr) => {
            if (unlinkErr) console.error('Error deleting icon file:', unlinkErr);
          });
        }
    
        res.json({ message: 'Product Item deleted successfully' });
      } catch (err) {
        console.error('Error deleting product item:', err);
        res.status(500).json({ error: err.message });
      }
  },

  // ===== Payment Methods =====
  getAllPaymentMethods: async (req, res) => {
    try {
      const [methods] = await db.query('SELECT * FROM payment_methods');
      res.json(methods);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createPaymentMethod: async (req, res) => {
    const { name, code, icon_url, status } = req.body;
    try {
      const [result] = await db.query(
        'INSERT INTO payment_methods (name, code, icon_url, status) VALUES (?, ?, ?, ?)',
        [name, code, icon_url, status]
      );
      res.status(201).json({ id: result.insertId, ...req.body });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  updatePaymentMethod: async (req, res) => {
    const { id } = req.params;
    const { name, code, icon_url, status } = req.body;
    try {
      await db.query(
        'UPDATE payment_methods SET name = ?, code = ?, icon_url = ?, status = ? WHERE id = ?',
        [name, code, icon_url, status, id]
      );
      res.json({ message: 'Payment method updated successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  deletePaymentMethod: async (req, res) => {
    const { id } = req.params;
    try {
      await db.query('DELETE FROM payment_methods WHERE id = ?', [id]);
      res.json({ message: 'Payment method deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // ===== Transactions =====
  getAllTransactions: async (req, res) => {
    try {
        // MODIFIKASI: Tambahkan logika paginasi dan pencarian
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search ? `%${req.query.search}%` : '%';
        const offset = (page - 1) * limit;
  
        // Filter berdasarkan status dari frontend (jika ada)
        const filter = req.query.filter;
        let statusWhereClause = '';
        if (filter === 'problem') {
            statusWhereClause = "t.status IN ('PENDING')";
        }
  
        let whereClause = 'WHERE (t.invoice_number LIKE ? OR u.username LIKE ?)';
        let searchParams = [search, search];
  
        if (statusWhereClause) {
            whereClause += ` AND ${statusWhereClause}`;
        }
        
        const countQuery = `
          SELECT COUNT(t.id) AS total
          FROM transactions t
          JOIN product_items pi ON t.product_item_id = pi.id
          JOIN item_groups ig ON pi.item_group_id = ig.id
          JOIN products p ON ig.product_id = p.id
          JOIN categories c ON p.category_id = c.id
          LEFT JOIN users u ON t.user_id = u.id
          LEFT JOIN payment_methods pm ON t.payment_method = pm.code
          ${whereClause}`;
        const [totalResult] = await db.query(countQuery, searchParams);
        const totalItems = totalResult[0].total;
        const totalPages = Math.ceil(totalItems / limit);
  
        const dataQuery = `
          SELECT
            t.id, t.invoice_number, t.transaction_date, t.total_price, t.status,
            pi.name AS item_name,
            p.name AS product_name,
            c.name AS category_name,
            u.username AS user_name,
            pm.name AS payment_method
          FROM transactions t
          JOIN product_items pi ON t.product_item_id = pi.id
          JOIN item_groups ig ON pi.item_group_id = ig.id
          JOIN products p ON ig.product_id = p.id
          JOIN categories c ON p.category_id = c.id
          LEFT JOIN users u ON t.user_id = u.id
          LEFT JOIN payment_methods pm ON t.payment_method = pm.code
          ${whereClause}
          ORDER BY t.transaction_date DESC
          LIMIT ? OFFSET ?`;
        const [transactions] = await db.query(dataQuery, [...searchParams, limit, offset]);
  
        res.json({
          data: transactions,
          total_pages: totalPages,
          current_page: page,
          total_items: totalItems,
        });
      } catch (err) {
        console.error('Error fetching all transactions:', err);
        res.status(500).json({ error: err.message });
      }
    }, 

  getProblemTransactions: async (req, res) => {
    try {
        const [transactions] = await db.query(`
          SELECT
            t.id, t.invoice_number, t.transaction_date, t.total_price, t.status,
            pi.name AS item_name,
            p.name AS product_name,
            c.name AS category_name, -- Tambahkan category_name
            u.username AS user_name,
            pm.name AS payment_method
          FROM transactions t
          JOIN product_items pi ON t.product_item_id = pi.id
          JOIN item_groups ig ON pi.item_group_id = ig.id -- JOIN BARU: product_items ke item_groups
          JOIN products p ON ig.product_id = p.id -- JOIN BARU: item_groups ke products
          JOIN categories c ON p.category_id = c.id -- Join dengan categories
          LEFT JOIN users u ON t.user_id = u.id
          LEFT JOIN payment_methods pm ON t.payment_method = pm.code
          WHERE t.status IN ('PENDING') -- Hanya tampilkan status PENDING untuk 'Bermasalah'
          ORDER BY t.transaction_date DESC
        `);
        res.json(transactions);
      } catch (err) {
        console.error('Error fetching problem transactions:', err);
        res.status(500).json({ error: err.message });
      }
    },

  getTransactionDetails: async (req, res) => {
    const { id } = req.params;
    try {
      const [transactions] = await db.query(`
        SELECT
          t.*,
          pi.name AS item_name,
          p.name AS product_name,
          c.name AS category_name, -- Tambahkan category_name
          u.username AS user_name, u.email AS user_email,
          pm.name AS payment_method
        FROM transactions t
        JOIN product_items pi ON t.product_item_id = pi.id
        JOIN item_groups ig ON pi.item_group_id = ig.id -- JOIN BARU: product_items ke item_groups
        JOIN products p ON ig.product_id = p.id -- JOIN BARU: item_groups ke products
        JOIN categories c ON p.category_id = c.id -- Join dengan categories
        LEFT JOIN users u ON t.user_id = u.id
        LEFT JOIN payment_methods pm ON t.payment_method = pm.code
        WHERE t.id = ?
      `, [id]);
  
      if (transactions.length === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
  
      res.json(transactions[0]);
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      res.status(500).json({ error: err.message });
    }
  },

  updateTransactionStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Status baru dari frontend
  
    // Validasi status yang diterima (opsional tapi disarankan)
    const validStatuses = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided' });
    }
  
    try {
      const [result] = await db.query(
        'UPDATE transactions SET status = ? WHERE id = ?',
        [status, id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }
  
      res.json({ message: 'Transaction status updated successfully' });
    } catch (err) {
      console.error('Error updating transaction status:', err);
      res.status(500).json({ error: err.message });
    }
  },

  deleteTransaction : async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM transactions WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        console.error('Error deleting transaction:', err);
        res.status(500).json({ error: err.message });
    }
   },

 // ===== User =====

   getUsers : async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search ? `%${req.query.search}%` : '%';
        const filterRole = req.query.role || null;
        const filterStatus = req.query.status !== undefined ? parseInt(req.query.status) : null;
        const offset = (page - 1) * limit;
    
        let whereClauses = [];
        let queryParams = [];
    
        whereClauses.push('(username LIKE ? OR email LIKE ?)');
        queryParams.push(search, search);
    
        if (filterRole && filterRole !== 'all') {
          whereClauses.push('role = ?');
          queryParams.push(filterRole);
        }
    
        if (filterStatus !== null && (filterStatus === 0 || filterStatus === 1)) {
          whereClauses.push('status = ?');
          queryParams.push(filterStatus);
        }
    
        const whereString = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
        const queryCount = `SELECT COUNT(id) AS total_users FROM users ${whereString}`;
        const [totalUsersResult] = await db.query(queryCount, queryParams);
        const totalUsers = totalUsersResult[0].total_users;
        const totalPages = Math.ceil(totalUsers / limit);
    
        const queryData = `SELECT id, username, email, role, gampang_coin_balance, status FROM users ${whereString} ORDER BY username ASC LIMIT ? OFFSET ?`;
        const [users] = await db.query(queryData, [...queryParams, limit, offset]);
    
        res.json({
          data: users, // Diubah menjadi 'data' agar konsisten
          total_pages: totalPages,
          current_page: page,
          total_items: totalUsers
        });
      } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: err.message });
      }
    },

   getUserById : async (req, res) => {
    try {
        const [user] = await db.query('SELECT id, username, email, role, gampang_coin_balance, status FROM users WHERE id = ?', [req.params.id]);
        if (user.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json(user[0]);
      } catch (err) {
        console.error('Error fetching user by ID:', err);
        res.status(500).json({ error: err.message });
      }
    },

   updateUser : async (req, res) => {
    try {
        const { role, gampang_coin_balance, status } = req.body;
        const userId = req.params.id;
    
        // Validasi data (opsional tapi disarankan)
        if (role && !['user', 'admin'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role provided' });
        }
        if (status !== undefined && ![0, 1].includes(parseInt(status))) {
            return res.status(400).json({ error: 'Invalid status provided. Must be 0 or 1.' });
        }
        if (gampang_coin_balance !== undefined && isNaN(parseFloat(gampang_coin_balance))) {
            return res.status(400).json({ error: 'Invalid balance provided. Must be a number.' });
        }
    
        const [result] = await db.query(
          `UPDATE users SET
             role = COALESCE(?, role),
             gampang_coin_balance = COALESCE(?, gampang_coin_balance),
             status = COALESCE(?, status)
           WHERE id = ?`,
          [role, gampang_coin_balance, status, userId]
        );
    
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User updated successfully' });
      } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ error: err.message });
      }
    },

   deleteUser : async (req, res) => {
    try {
        const userId = req.params.id;
        // Pertimbangkan untuk melakukan soft delete (mengubah status menjadi tidak aktif)
        // daripada hard delete untuk menjaga integritas data transaksi jika diperlukan.
        // Contoh soft delete:
        // const [result] = await db.query('UPDATE users SET status = 0 WHERE id = ?', [userId]);
    
        // Contoh hard delete:
        const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId]);
    
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
        } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: err.message });
        }
    },

// KODE BARU: Letakkan ini di dalam module.exports di file adminController.js

  // ===== Articles =====
  getAllArticles: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search ? `%${req.query.search}%` : '%';
      const status = req.query.status;
      const offset = (page - 1) * limit;

      let whereClauses = ['(title LIKE ? OR author_name LIKE ?)'];
      let queryParams = [search, search];

      if (status && (status === 'published' || status === 'draft')) {
        whereClauses.push('status = ?');
        queryParams.push(status);
      }

      const whereString = `WHERE ${whereClauses.join(' AND ')}`;

      const countQuery = `SELECT COUNT(id) AS total FROM articles ${whereString}`;
      const [totalResult] = await db.query(countQuery, queryParams);
      const totalItems = totalResult[0].total;
      const totalPages = Math.ceil(totalItems / limit);

      const dataQuery = `SELECT id, title, slug, thumbnail_url, author_name, status, created_at FROM articles ${whereString} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      const [articles] = await db.query(dataQuery, [...queryParams, limit, offset]);
      
      const articlesWithFullUrls = articles.map(article => ({
        ...article,
        thumbnail_url: getFullImageUrl(req, article.thumbnail_url)
      }));

      res.json({
        data: articlesWithFullUrls,
        total_pages: totalPages,
        current_page: page,
        total_items: totalItems
      });

    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getArticleById: async (req, res) => {
    try {
      const [articles] = await db.query('SELECT * FROM articles WHERE id = ?', [req.params.id]);
      if (articles.length === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }
      const articleWithFullUrl = {
        ...articles[0],
        thumbnail_url: getFullImageUrl(req, articles[0].thumbnail_url)
      };
      res.json(articleWithFullUrl);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createArticle: async (req, res) => {
    try {
      // 1. Ambil data teks dari req.body
      const { title, content, author_name, status } = req.body;

      // 2. Buat slug dari judul
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      
      // 3. Cek apakah ada file yang diupload oleh Multer
      // Multer akan menempatkan info file di `req.file` karena kita menggunakan `upload.single()`
      let thumbnail_url = null;
      if (req.file) {
        // Jika ada, buat path URL untuk disimpan di database
        thumbnail_url = `/images/${req.file.filename}`;
      }

      // 4. Masukkan semua data ke database, termasuk thumbnail_url (bisa null jika tidak ada gambar)
      const [result] = await db.query(
        'INSERT INTO articles (title, slug, content, author_name, status, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?)',
        [title, slug, content, author_name, status, thumbnail_url]
      );
      res.status(201).json({ message: 'Article created successfully', articleId: result.insertId });
    } catch (err) {
      console.error("Error creating article:", err);
      // Jika terjadi error, hapus file yang mungkin sudah terupload
      if (req.file) fs.unlink(req.file.path, e => e && console.error("Error deleting file on failure:", e));
      res.status(500).json({ error: err.message });
    }
  },

  updateArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, author_name, status } = req.body;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

      // Ambil path gambar lama dari database untuk dihapus nanti jika ada gambar baru
      const [oldArticleResult] = await db.query('SELECT thumbnail_url FROM articles WHERE id = ?', [id]);
      const oldArticle = oldArticleResult[0];

      let thumbnail_url = oldArticle ? oldArticle.thumbnail_url : null;

      // Cek apakah ada file BARU yang diupload
      if (req.file) {
        // Jika ada gambar lama, hapus dari server
        if (oldArticle && oldArticle.thumbnail_url) {
            const oldPath = path.join(__dirname, '..', oldArticle.thumbnail_url);
            // Cek apakah file benar-benar ada sebelum menghapus
            if (fs.existsSync(oldPath)) {
                fs.unlink(oldPath, e => e && console.error("Error deleting old thumbnail:", e));
            }
        }
        // Gunakan path gambar yang baru
        thumbnail_url = `/images/${req.file.filename}`;
      }

      await db.query(
        'UPDATE articles SET title = ?, slug = ?, content = ?, author_name = ?, status = ?, thumbnail_url = ? WHERE id = ?',
        [title, slug, content, author_name, status, thumbnail_url, id]
      );
      res.json({ message: 'Article updated successfully' });
    } catch (err) {
      console.error("Error updating article:", err);
      // Jika terjadi error saat update, hapus file baru yang mungkin terupload
      if (req.file) fs.unlink(req.file.path, e => e && console.error("Error deleting new file on failure:", e));
      res.status(500).json({ error: err.message });
    }
  },

  deleteArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const [oldArticle] = await db.query('SELECT thumbnail_url FROM articles WHERE id = ?', [id]);
      
      const [result] = await db.query('DELETE FROM articles WHERE id = ?', [id]);
      if (result.affectedRows > 0 && oldArticle.length > 0 && oldArticle[0].thumbnail_url) {
        const oldPath = path.join(__dirname, '..', oldArticle[0].thumbnail_url);
        if (fs.existsSync(oldPath)) fs.unlink(oldPath, e => e && console.error("Error deleting thumbnail:", e));
      }
      res.json({ message: 'Article deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

getFullImageUrl
};