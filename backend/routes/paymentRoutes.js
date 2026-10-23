const express = require('express');
const router = express.Router();
const { receivePayment, getPartyPayments } = require('../controllers/paymentController');

router.post('/receive', receivePayment);
router.get('/party/:partyId', getPartyPayments);

module.exports = router;
