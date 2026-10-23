const express = require('express');
const router = express.Router();
const { getParties, createParty, getPartyById, getPartyLedger, deleteParty } = require('../controllers/partyController');

router.get('/', getParties);
router.post('/', createParty);
router.get('/:id', getPartyById);
router.get('/:id/ledger', getPartyLedger);
router.delete('/:id', deleteParty);

module.exports = router;

