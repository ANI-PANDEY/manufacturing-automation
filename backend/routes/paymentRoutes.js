const express = require('express');
const router = express.Router();
const { receivePayment, getPartyPayments, getAllPayments } = require('../controllers/paymentController');

router.get('/', getAllPayments);
router.post('/receive', receivePayment);
router.get('/party/:partyId', getPartyPayments);

module.exports = router;
