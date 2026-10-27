const express = require('express');
const router = express.Router();
const {
  receivePayment,
  getPartyTransactions,
} = require('../controllers/transactionController');

// POST /api/transactions/receive-payment
router.post('/receive-payment', receivePayment);

// GET /api/transactions/party/:partyId
router.get('/party/:partyId', getPartyTransactions);

module.exports = router;
