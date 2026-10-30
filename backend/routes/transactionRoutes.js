const express = require('express');
const router = express.Router();
const {
  receivePayment,
  getPartyTransactions,
  updateTransaction,
  deleteTransaction,
  getTransactionById,
} = require('../controllers/transactionController');

// POST /api/transactions/receive-payment
router.post('/receive-payment', receivePayment);

// GET /api/transactions/party/:partyId
router.get('/party/:partyId', getPartyTransactions);

// Single transaction operations
router.get('/:id', getTransactionById);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;

