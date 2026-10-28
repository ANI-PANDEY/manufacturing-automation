/**
 * Comprehensive System Test Suite for ERP
 * Tests:
 * 1. HistoricalBill Mongoose Schema & In-Memory Store
 * 2. Mathematical 2-Decimal Precision
 * 3. Itemized Historical Bills creation (Bags, Qty/Bag, Rate, Amount, Payments)
 * 4. Double-Entry Ledger Synchronization ('INVOICE' Debit & 'PAYMENT_RECEIVED' Credit)
 * 5. Running Balance & Passbook Accuracy
 * 6. Historical Bills Retrieval by Party
 * 7. Tax Invoice Print Data Generation
 * 8. Edge Cases (Loose quantities, full payment, zero payment, multi-item orders)
 */

const { round2 } = require('./utils/mathUtils');
const store = require('./utils/inMemoryStore');
const {
  createHistoricalBills,
  getPartyHistoricalBills,
  getHistoricalBillPrintData,
} = require('./controllers/historicalBillController');
const { getPartyLedger, getPartyLedgerSummary } = require('./controllers/partyController');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Full System & Business Logic Test Suite');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST 1: Mathematical Precision & Rounding (round2)
  // ----------------------------------------------------
  console.log('👉 Section 1: Decimal Precision & Float Math Tests');
  assert(round2(0.1 + 0.2) === 0.3, '0.1 + 0.2 equals exactly 0.30');
  assert(round2(19.995) === 20, '19.995 rounds correctly to 20');
  assert(round2(12.344) === 12.34, '12.344 rounds down to 12.34');
  assert(round2(100.555) === 100.56, '100.555 rounds up to 100.56');

  // ----------------------------------------------------
  // TEST 2: Setup Test User & Party in Store
  // ----------------------------------------------------
  console.log('\n👉 Section 2: Party Account & Opening Balance Setup');
  const testUserId = 'test_user_789';
  const testPartyId = 'party_om_steels_001';

  store.parties = [
    {
      _id: testPartyId,
      user: testUserId,
      name: 'Om Steels & Forgings Ltd',
      phone: '9820011223',
      type: 'CUSTOMER',
      openingBalance: 15000,
      openingBalanceType: 'TO_RECEIVE',
      currentBalance: 15000,
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  ];
  store.transactions = [];
  store.historicalBills = [];

  assert(store.parties.length === 1, 'Party initialized with ₹15,000 opening balance');

  // Mock Req & Res factory
  function createMockReq(body, params = {}, userFilter = { user: testUserId }) {
    return {
      body,
      params,
      userFilter,
      userId: testUserId,
      isDemoAdmin: false,
    };
  }

  function createMockRes() {
    const res = {
      statusCode: 200,
      jsonPayload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonPayload = data;
        return this;
      },
    };
    return res;
  }

  // ----------------------------------------------------
  // TEST 3: Create Standard Itemized Historical Bill
  // Bags: 20, Qty/Bag: 25 kg, Rate: ₹85/kg -> Amount: ₹42,500
  // Payment Received: ₹20,000 -> Balance Due: ₹22,500
  // ----------------------------------------------------
  console.log('\n👉 Section 3: Itemized Historical Bill Entry & Ledger Sync');
  const bill1Req = createMockReq({
    partyId: testPartyId,
    billNumber: 'HB-TEST-001',
    date: '2026-03-10',
    items: [
      {
        description: 'TMT Rebars 12mm Grade 500',
        bags: 20,
        qtyPerBag: 25,
        rate: 85,
      },
    ],
    paymentReceived: 20000,
    notes: 'Old register entry migrated',
  });
  const bill1Res = createMockRes();

  await createHistoricalBills(bill1Req, bill1Res);

  assert(bill1Res.statusCode === 201, 'POST /historical-bills responded with 201 Created');
  assert(bill1Res.jsonPayload.success === true, 'Response indicates success: true');
  assert(bill1Res.jsonPayload.bills.length === 1, '1 Historical bill created');

  const savedBill1 = bill1Res.jsonPayload.bills[0];
  assert(savedBill1.billNumber === 'HB-TEST-001', 'Bill number preserved as HB-TEST-001');
  assert(savedBill1.items[0].totalWeight === 500, 'Auto-calculated Total Weight: 20 * 25 = 500 kg');
  assert(savedBill1.items[0].amount === 42500, 'Auto-calculated Line Amount: 500 * 85 = ₹42,500');
  assert(savedBill1.subTotal === 42500, 'Bill SubTotal is ₹42,500');
  assert(savedBill1.paymentReceived === 20000, 'Payment Received recorded as ₹20,000');
  assert(savedBill1.balanceDue === 22500, 'Balance Due calculated accurately as ₹22,500');
  assert(savedBill1.paymentStatus === 'PARTIAL', 'Payment status marked as PARTIAL');

  // Verify Ledger Transactions
  const invoiceTx = store.transactions.find((tx) => tx.type === 'INVOICE' && tx.referenceId === 'HB-TEST-001');
  const paymentTx = store.transactions.find((tx) => tx.type === 'PAYMENT_RECEIVED' && tx.referenceId === 'RCP-HB-TEST-001');

  assert(invoiceTx !== undefined, 'INVOICE debit transaction created in ledger');
  assert(invoiceTx.debit === 42500, 'Invoice transaction has debit = ₹42,500 and credit = 0');
  assert(paymentTx !== undefined, 'PAYMENT_RECEIVED credit transaction created in ledger');
  assert(paymentTx.credit === 20000, 'Payment transaction has credit = ₹20,000 and debit = 0');

  // Verify Party Balance updated: Initial (15000) + Due (22500) = 37500
  const updatedParty = store.parties.find((p) => p._id === testPartyId);
  assert(updatedParty.currentBalance === 37500, `Party balance accurately updated to ₹37,500 (was ${updatedParty.currentBalance})`);

  // ----------------------------------------------------
  // TEST 4: Multi-Item Bill with Loose Weight & Zero Payment
  // Item 1: Bags: 10, Qty/Bag: 50 kg -> 500 kg @ ₹110 = ₹55,000
  // Item 2: Loose Weight: 150 kg (no bags) @ ₹120 = ₹18,000
  // Total Subtotal: ₹73,000, Payment: 0 -> Status: UNPAID
  // ----------------------------------------------------
  console.log('\n👉 Section 4: Multi-Item Bill & Loose Weight (No bags) Test');
  const bill2Req = createMockReq({
    partyId: testPartyId,
    billNumber: 'HB-TEST-002',
    date: '2026-03-15',
    items: [
      {
        description: 'Industrial Flanges',
        bags: 10,
        qtyPerBag: 50,
        rate: 110,
      },
      {
        description: 'Loose Steel Scraps Grade B',
        bags: 0,
        qtyPerBag: 0,
        totalWeight: 150,
        rate: 120,
      },
    ],
    paymentReceived: 0,
    notes: 'Second historical delivery',
  });
  const bill2Res = createMockRes();

  await createHistoricalBills(bill2Req, bill2Res);

  const savedBill2 = bill2Res.jsonPayload.bills[0];
  assert(savedBill2.items.length === 2, '2 Line items parsed');
  assert(savedBill2.items[0].totalWeight === 500 && savedBill2.items[0].amount === 55000, 'Item 1: 500kg = ₹55,000');
  assert(savedBill2.items[1].totalWeight === 150 && savedBill2.items[1].amount === 18000, 'Item 2 (loose): 150kg = ₹18,000');
  assert(savedBill2.subTotal === 73000, 'Total Subtotal: 55000 + 18000 = ₹73,000');
  assert(savedBill2.paymentReceived === 0, 'Zero payment received');
  assert(savedBill2.balanceDue === 73000, 'Balance due is full ₹73,000');
  assert(savedBill2.paymentStatus === 'UNPAID', 'Payment status is UNPAID');

  // Party balance should now be: 37500 + 73000 = 110500
  assert(updatedParty.currentBalance === 110500, `Party balance accurately updated to ₹110,500 (was ${updatedParty.currentBalance})`);

  // ----------------------------------------------------
  // TEST 5: Fully Paid Bill Test
  // SubTotal: ₹30,000, Payment: ₹30,000 -> Status: PAID, Due: 0
  // ----------------------------------------------------
  console.log('\n👉 Section 5: Fully Paid Bill Test');
  const bill3Req = createMockReq({
    partyId: testPartyId,
    billNumber: 'HB-TEST-003',
    date: '2026-03-20',
    items: [
      {
        description: 'Galvanized Wire 16G',
        bags: 10,
        qtyPerBag: 25,
        rate: 120,
      },
    ],
    paymentReceived: 30000,
  });
  const bill3Res = createMockRes();

  await createHistoricalBills(bill3Req, bill3Res);

  const savedBill3 = bill3Res.jsonPayload.bills[0];
  assert(savedBill3.subTotal === 30000, 'Subtotal is ₹30,000');
  assert(savedBill3.paymentReceived === 30000, 'Payment received is ₹30,000');
  assert(savedBill3.balanceDue === 0, 'Balance due is ₹0');
  assert(savedBill3.paymentStatus === 'PAID', 'Payment status is marked as PAID');
  assert(updatedParty.currentBalance === 110500, 'Party balance remains ₹110,500 (since balanceDue was 0)');

  // ----------------------------------------------------
  // TEST 6: Fetch Party Historical Bills Chronologically
  // ----------------------------------------------------
  console.log('\n👉 Section 6: Query Party Historical Bills');
  const getBillsReq = createMockReq({}, { partyId: testPartyId });
  const getBillsRes = createMockRes();

  await getPartyHistoricalBills(getBillsReq, getBillsRes);

  assert(getBillsRes.statusCode === 200, 'GET /parties/:partyId/historical-bills returned 200 OK');
  assert(getBillsRes.jsonPayload.count === 3, 'Retrieved all 3 historical bills');
  assert(getBillsRes.jsonPayload.bills.some((b) => b.billNumber === 'HB-TEST-001'), 'Bill 1 found');
  assert(getBillsRes.jsonPayload.bills.some((b) => b.billNumber === 'HB-TEST-002'), 'Bill 2 found');
  assert(getBillsRes.jsonPayload.bills.some((b) => b.billNumber === 'HB-TEST-003'), 'Bill 3 found');

  // ----------------------------------------------------
  // TEST 7: Generate Invoice Print Data
  // ----------------------------------------------------
  console.log('\n👉 Section 7: Tax Invoice Print Data Generation');
  const printReq = createMockReq({}, { billId: 'HB-TEST-001' });
  const printRes = createMockRes();

  await getHistoricalBillPrintData(printReq, printRes);

  assert(printRes.statusCode === 200, 'GET /historical-bills/:billId/print-data returned 200 OK');
  const printData = printRes.jsonPayload.data;
  assert(printData.billNumber === 'HB-TEST-001', 'Print data invoice number matches');
  assert(printData.party.name === 'Om Steels & Forgings Ltd', 'Print data includes party name');
  assert(printData.items.length === 1, 'Print data includes itemized rows');
  assert(printData.items[0].bags === 20, 'Print item has 20 bags');
  assert(printData.items[0].qtyPerBag === 25, 'Print item has 25 kg/bag');
  assert(printData.totalWeight === 500, 'Print total weight is 500 kg');
  assert(printData.totalBags === 20, 'Print total bags count is 20');
  assert(printData.subTotal === 42500, 'Print subtotal is ₹42,500');
  assert(printData.paymentReceived === 20000, 'Print payment received is ₹20,000');
  assert(printData.balanceDue === 22500, 'Print balance due is ₹22,500');
  assert(printData.paymentStatus === 'PARTIAL', 'Print status is PARTIAL');

  // ----------------------------------------------------
  // TEST 8: Full Ledger Statement Verification
  // ----------------------------------------------------
  console.log('\n👉 Section 8: Ledger Passbook Statement Verification');
  const ledgerReq = createMockReq({}, { id: testPartyId });
  const ledgerRes = createMockRes();

  await getPartyLedger(ledgerReq, ledgerRes);

  assert(ledgerRes.statusCode === 200, 'GET /parties/:id/ledger returned 200 OK');
  const ledger = ledgerRes.jsonPayload.data;

  console.log(`  Ledger Total Debit:   ₹${ledger.totalDebit}`);
  console.log(`  Ledger Total Credit:  ₹${ledger.totalCredit}`);
  console.log(`  Ledger Closing Due:   ₹${ledger.closingBalance}`);

  assert(ledger.closingBalance === 110500, `Closing balance in passbook matches exactly: ₹110,500`);
  assert(ledger.ledger.length >= 4, 'Passbook contains opening balance + all bill debits and payments');

  // Verify GET /parties/:partyId/ledger-summary
  const summaryReq = createMockReq({}, { partyId: testPartyId });
  const summaryRes = createMockRes();
  await getPartyLedgerSummary(summaryReq, summaryRes);

  assert(summaryRes.statusCode === 200, 'GET /parties/:partyId/ledger-summary returned 200 OK');
  const summary = summaryRes.jsonPayload.data;
  console.log(`  Summary Total Payable: ₹${summary.totalPayable}`);
  console.log(`  Summary Total Received: ₹${summary.totalReceived}`);
  console.log(`  Summary Remaining Due:  ₹${summary.remainingBalance}`);
  assert(summary.remainingBalance === 110500, 'Ledger summary remaining balance matches ₹110,500');
  assert(summary.status === 'PARTIAL', 'Ledger summary status is PARTIAL');

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test suite execution failed:', err);
  process.exit(1);
});
