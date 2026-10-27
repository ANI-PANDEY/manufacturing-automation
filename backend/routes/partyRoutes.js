const express = require('express');
const router = express.Router();
const {
  getParties,
  createParty,
  bulkImportParties,
  migrateBulkParties,
  getPartyById,
  getPartyLedger,
  getPartyLedgerSummary,
  deleteParty,
} = require('../controllers/partyController');

router.get('/', getParties);
router.post('/', createParty);
router.post('/bulk-import', bulkImportParties);
router.post('/migrate-bulk', migrateBulkParties);
router.get('/:partyId/ledger-summary', getPartyLedgerSummary);
router.get('/:id', getPartyById);
router.get('/:id/ledger', getPartyLedger);
router.delete('/:id', deleteParty);

module.exports = router;

