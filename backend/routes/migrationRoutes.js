const express = require('express');
const router = express.Router();
const {
  getMigrationStats,
  bulkImportParties,
  bulkUploadProducts,
  bulkImportRawMaterials,
  bulkImportOrders,
} = require('../controllers/migrationController');

router.get('/status', getMigrationStats);
router.post('/parties', bulkImportParties);
router.post('/products', bulkUploadProducts);
router.post('/raw-materials', bulkImportRawMaterials);
router.post('/orders', bulkImportOrders);

module.exports = router;
