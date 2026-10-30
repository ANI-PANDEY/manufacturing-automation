const express = require('express');
const router = express.Router();
const {
  getParties,
  createParty,
  bulkImportParties,
  migrateBulkParties,
  getPartyById,
  updateParty,
  getPartyLedger,
  getPartyLedgerSummary,
  deleteParty,
} = require('../controllers/partyController');

const {
  getPartyHistoricalBills,
} = require('../controllers/historicalBillController');

router.get('/', getParties);
router.post('/', createParty);
router.post('/bulk-import', bulkImportParties);
router.post('/migrate-bulk', migrateBulkParties);
router.get('/:partyId/ledger-summary', getPartyLedgerSummary);
router.get('/:partyId/historical-bills', getPartyHistoricalBills);
router.get('/:id', getPartyById);
router.put('/:id', updateParty);
router.get('/:id/ledger', getPartyLedger);
router.delete('/:id', deleteParty);

module.exports = router;

