const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const multer = require('multer');

// Konfigurasi Multer untuk penyimpanan file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Pastikan folder 'images' ada di root gampangtopup-backend
      cb(null, 'images/'); // Folder tujuan untuk menyimpan file
    },
    filename: (req, file, cb) => {
      // Nama file akan unik: timestamp-originalfilename.ext
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  
  // Filter jenis file (hanya izinkan gambar)
  const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diizinkan!'), false);
    }
  };
  
  // Inisialisasi Multer dengan konfigurasi
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 1024 * 1024 * 5 } // Batas ukuran file 5MB
  });

// Middleware untuk semua route admin
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard Routes
router.get('/dashboard', adminController.getDashboardStats);

// Categories Routes
router.get('/categories', adminController.getAllCategories);
router.post('/categories', adminController.createCategory);
router.put('/categories/:id', adminController.updateCategory);
router.get('/categories/:id', adminController.getCategoryById);
router.delete('/categories/:id', adminController.deleteCategory);

// Item Groups Routes
router.get('/item-groups', adminController.getAllItemGroups);
router.post('/item-groups', adminController.createItemGroup);
router.put('/item-groups/:id', adminController.updateItemGroup);
router.get('/item-groups/:id', adminController.getItemGroupById);
router.delete('/item-groups/:id', adminController.deleteItemGroup);

// Products Routes
router.get('/products', adminController.getAllProducts);
router.post('/products', upload.fields([ // <-- Menggunakan Multer di sini
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), adminController.createProduct);

router.put('/products/:id', upload.fields([ // <-- Menggunakan Multer di sini
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]), adminController.updateProduct);

router.get('/products/:id', adminController.getProductById);
router.delete('/products/:id', adminController.deleteProduct);

// Product Items Routes
router.get('/product-items', adminController.getAllProductItems);
router.post('/product-items', upload.fields([ // <-- Menggunakan Multer di sini
    { name: 'icon', maxCount: 1 },
]), adminController.createProductItem);
router.put('/product-items/:id', upload.fields([ // <-- Menggunakan Multer di sini
    { name: 'icon', maxCount: 1 },
]), adminController.updateProductItem);

router.get('/product-items/:id', adminController.getProductItemById);
router.delete('/product-items/:id', adminController.deleteProductItem);

// Payment Methods Routes
router.get('/payment-methods', adminController.getAllPaymentMethods);
router.post('/payment-methods', adminController.createPaymentMethod);
router.put('/payment-methods/:id', adminController.updatePaymentMethod);
router.delete('/payment-methods/:id', adminController.deletePaymentMethod);

// Transactions Routes
router.get('/transactions', adminController.getAllTransactions);
router.get('/transactions/:id', adminController.getTransactionDetails);
router.put('/transactions/:id/status', adminController.updateTransactionStatus);
router.get('/problem-transactions', adminController.getProblemTransactions);
router.delete('/transactions/:id', adminController.deleteTransaction);

// User Management Routes
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Articles Routes
router.get('/articles', adminController.getAllArticles);
router.post('/articles', upload.single('thumbnail'), adminController.createArticle); // Hanya 1 gambar 'thumbnail'
router.put('/articles/:id', upload.single('thumbnail'), adminController.updateArticle);
router.get('/articles/:id', adminController.getArticleById);
router.delete('/articles/:id', adminController.deleteArticle);

module.exports = router;