const express = require('express');
const router = express.Router();
const {
  receivePayment,
  getPartyPayments,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
} = require('../controllers/paymentController');

router.get('/', getAllPayments);
router.post('/receive', receivePayment);
router.get('/party/:partyId', getPartyPayments);
router.get('/:id', getPaymentById);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

module.exports = router;

