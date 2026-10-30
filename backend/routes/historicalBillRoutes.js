const express = require('express');
const router = express.Router();
const {
  createHistoricalBills,
  getPartyHistoricalBills,
  getHistoricalBillPrintData,
  getHistoricalBillById,
  updateHistoricalBill,
  deleteHistoricalBill,
} = require('../controllers/historicalBillController');

// POST /api/historical-bills
router.post('/', createHistoricalBills);

// GET /api/historical-bills/:billId/print-data
router.get('/:billId/print-data', getHistoricalBillPrintData);

// GET /api/historical-bills/party/:partyId
router.get('/party/:partyId', getPartyHistoricalBills);

// Single bill operations (view, edit/update, delete)
router.get('/:billId', getHistoricalBillById);
router.put('/:billId', updateHistoricalBill);
router.delete('/:billId', deleteHistoricalBill);

module.exports = router;
// THIS IS THE PLACE WHER WE ARE GETTING ALL THE DETAILS OF THE PREVIOUS BILL AND CALUTION ALONG WITH SHIPING WORK//