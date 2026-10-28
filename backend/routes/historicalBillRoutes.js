const express = require('express');
const router = express.Router();
const {
  createHistoricalBills,
  getPartyHistoricalBills,
  getHistoricalBillPrintData,
} = require('../controllers/historicalBillController');

// POST /api/historical-bills
router.post('/', createHistoricalBills);

// GET /api/historical-bills/:billId/print-data
router.get('/:billId/print-data', getHistoricalBillPrintData);

// GET /api/historical-bills/party/:partyId
router.get('/party/:partyId', getPartyHistoricalBills);

module.exports = router;
