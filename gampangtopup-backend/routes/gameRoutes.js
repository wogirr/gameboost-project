const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Kategori
router.get('/categories', gameController.getCategories);

// Produk
router.get('/products/popular', gameController.getPopularProducts);

router.get('/products/flash-sale', gameController.getFlashSaleItems);

router.get('/products/search', gameController.searchProducts);

router.get('/products', gameController.getProducts);

router.get('/products/:id', gameController.getProductDetails);



module.exports = router;