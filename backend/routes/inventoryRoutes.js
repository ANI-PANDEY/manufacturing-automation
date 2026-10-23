const express = require('express');
const router = express.Router();
const {
  inwardRawMaterial,
  getRawMaterials,
  getProducts,
  createProduct,
  bulkUploadProducts,
  restockProduct,
  restockRawMaterial,
  deleteProduct,
  deleteRawMaterial,
} = require('../controllers/inventoryController');

router.post('/raw-materials/inward', inwardRawMaterial);
router.post('/raw-materials/restock', restockRawMaterial);
router.delete('/raw-materials/:id', deleteRawMaterial);
router.get('/raw-materials', getRawMaterials);

router.get('/products', getProducts);
router.post('/products', createProduct);
router.post('/products/bulk-upload', bulkUploadProducts);
router.post('/products/restock', restockProduct);
router.delete('/products/:id', deleteProduct);

module.exports = router;
