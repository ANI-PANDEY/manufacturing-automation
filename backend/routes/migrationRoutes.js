const express = require('express');
const router = express.Router();
const {
  getMigrationStats,
  bulkImportParties,
  bulkUploadProducts,
  bulkImportRawMaterials,
  bulkImportOrders,
} = require('../controllers/migrationController');

const {
  createHistoricalBills,
  getHistoricalBillPrintData,
} = require('../controllers/historicalBillController');

router.get('/status', getMigrationStats);
router.post('/parties', bulkImportParties);
router.post('/products', bulkUploadProducts);
router.post('/raw-materials', bulkImportRawMaterials);
router.post('/orders', bulkImportOrders);
router.post('/historical-bills', createHistoricalBills);
router.get('/historical-bills/:billId/print-data', getHistoricalBillPrintData);

module.exports = router;
