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
  getHistoricalBillById,
  updateHistoricalBill,
  deleteHistoricalBill,
} = require('./controllers/historicalBillController');
const { getPartyLedger, getPartyLedgerSummary } = require('./controllers/partyController');
const { createOrder } = require('./controllers/orderController');
const {
  receivePayment,
  getPaymentById,
  updatePayment,
  deletePayment,
} = require('./controllers/paymentController');

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

  // 👉 Section 9: Decimal Quantity Order Placement & Dispatch Invoicing
  console.log('\n👉 Section 9: Decimal Quantity & Rate Order Placement (Dispatch & Invoicing)');
  const testProductId = 'prod_decimal_test_01';
  store.products.push({
    _id: testProductId,
    user: testUserId,
    productName: 'Galvanized Steel Coil 0.8mm',
    sku: 'GSC-08MM',
    stockQuantity: 15.75, // 15.75 Metric Tons in stock
    unit: 'Tons',
    unitPrice: 54000.50,
  });

  const decimalOrderReq = createMockReq({
    partyId: testPartyId,
    orderDate: '2026-10-29',
    taxRate: 18,
    dispatchNotes: 'Delivered 2.25 Tons via Flatbed Truck MH-04-1234',
    items: [
      {
        productId: testProductId,
        quantity: 2.25, // Decimal quantity
        unitPrice: 54000.50, // Decimal rate
      },
    ],
  });
  const decimalOrderRes = createMockRes();
  await createOrder(decimalOrderReq, decimalOrderRes);

  assert(decimalOrderRes.statusCode === 201, 'POST /api/orders responded with 201 Created for decimal quantity');
  assert(decimalOrderRes.jsonPayload.success === true, 'Decimal dispatch order created successfully');
  const createdOrder = decimalOrderRes.jsonPayload.order;
  assert(createdOrder.items[0].quantity === 2.25, 'Order item quantity preserved as 2.25 decimal');
  assert(createdOrder.items[0].subtotal === 121501.13, 'Line subtotal correctly computed as 2.25 * 54000.50 = ₹121,501.13');
  assert(createdOrder.subtotalAmount === 121501.13, 'Subtotal is ₹121,501.13');
  assert(createdOrder.taxAmount === 21870.20, '18% GST tax is ₹21,870.20');
  assert(createdOrder.totalAmount === 143371.33, 'Total bill amount is ₹143,371.33');

  // Verify stock deduction accurately with float precision: 15.75 - 2.25 = 13.5
  const updatedProduct = store.products.find((p) => p._id === testProductId);
  assert(updatedProduct.stockQuantity === 13.5, `Product stock deducted accurately: 15.75 - 2.25 = ${updatedProduct.stockQuantity}`);

  // Test smaller fractional order (e.g. 0.5 Tons)
  const fractionalOrderReq = createMockReq({
    partyId: testPartyId,
    orderDate: '2026-10-29',
    taxRate: 5,
    dispatchNotes: 'Sample delivery 0.5 Tons',
    items: [
      {
        productId: testProductId,
        quantity: 0.5,
        unitPrice: 50000,
      },
    ],
  });
  const fractionalOrderRes = createMockRes();
  await createOrder(fractionalOrderReq, fractionalOrderRes);
  assert(fractionalOrderRes.statusCode === 201, 'Sub-unit decimal order (0.5 qty) accepted with 201 Created');
  assert(updatedProduct.stockQuantity === 13.0, `Stock reduced cleanly to 13.0 Tons`);

  // ----------------------------------------------------
  // TEST 10: Edit / Correction Options for Payments & Historical Bills
  // ----------------------------------------------------
  console.log('\n👉 Section 10: Edit & Correction Options for Payments and Past Bills');

  // Test 10.1: Edit Historical Bill (Past Correction)
  // Let's edit HB-TEST-001 (which was subTotal=42500, paymentReceived=20000, balanceDue=22500)
  // Change rate from 85 to 100 (so 500 * 100 = 50000), paymentReceived from 20000 to 25000
  // New subtotal: 50000, new paymentReceived: 25000, new balanceDue: 25000
  // Old balanceDue was 22500 -> delta = +2500. Party balance should increase by 2500.
  const partyBeforeBillEdit = store.parties.find((p) => p._id === testPartyId);
  const balBeforeBillEdit = partyBeforeBillEdit.currentBalance;

  const editBillReq = createMockReq({
    billNumber: 'HB-TEST-001-MOD',
    date: '2026-10-15',
    items: [
      {
        description: 'Steel Cast Components 50mm (Grade A Updated)',
        bags: 20,
        qtyPerBag: 25,
        totalWeight: 500,
        rate: 100,
        amount: 50000,
      },
    ],
    subTotal: 50000,
    paymentReceived: 25000,
    notes: 'Corrected rates and recorded extra advance payment',
  }, { billId: 'HB-TEST-001' });

  const editBillRes = createMockRes();
  await updateHistoricalBill(editBillReq, editBillRes);

  assert(editBillRes.statusCode === 200, 'PUT /api/historical-bills/:billId responded with 200 OK');
  assert(editBillRes.jsonPayload.success === true, 'Historical bill updated successfully');
  assert(editBillRes.jsonPayload.bill.billNumber === 'HB-TEST-001-MOD', 'Bill number updated to HB-TEST-001-MOD');
  assert(editBillRes.jsonPayload.bill.subTotal === 50000, 'Updated subtotal is ₹50,000');
  assert(editBillRes.jsonPayload.bill.paymentReceived === 25000, 'Updated paymentReceived is ₹25,000');
  assert(editBillRes.jsonPayload.bill.balanceDue === 25000, 'Updated balanceDue is ₹25,000');
  assert(
    partyBeforeBillEdit.currentBalance === round2(balBeforeBillEdit + 2500),
    `Party balance updated accurately by delta (+₹2,500): ${partyBeforeBillEdit.currentBalance}`
  );

  // Verify getHistoricalBillById retrieves updated bill
  const getBillReq = createMockReq({}, { billId: 'HB-TEST-001-MOD' });
  const getBillRes = createMockRes();
  await getHistoricalBillById(getBillReq, getBillRes);
  assert(getBillRes.statusCode === 200, 'GET /api/historical-bills/:billId returned updated bill');
  assert(getBillRes.jsonPayload.bill.items[0].rate === 100, 'Updated rate 100 retrieved successfully');

  // Test 10.2: Receive Payment & Then Edit Received Payment
  const balBeforePay = partyBeforeBillEdit.currentBalance;
  const receivePayReq = createMockReq({
    partyId: testPartyId,
    amount: 15000,
    paymentDate: '2026-10-20',
    paymentMode: 'UPI',
    referenceNo: 'UPI-TEST-999',
    notes: 'Initial test payment',
  });
  const receivePayRes = createMockRes();
  await receivePayment(receivePayReq, receivePayRes);
  assert(receivePayRes.statusCode === 201, 'Payment received with 201 Created');
  const createdPaymentId = receivePayRes.jsonPayload.transaction._id;
  const balAfterPay = partyBeforeBillEdit.currentBalance;
  assert(balAfterPay === round2(balBeforePay - 15000), `Party balance reduced by initial payment of ₹15,000`);

  // Now user corrects the payment: actually paid ₹20,000 via BANK_TRANSFER with UTR
  // Difference: newAmount (20000) - oldAmount (15000) = +5000.
  // Party balance should decrease by another ₹5,000!
  const editPayReq = createMockReq({
    amountPaid: 20000,
    paymentDate: '2026-10-20',
    paymentMode: 'BANK_TRANSFER',
    referenceNo: 'NEFT-CORRECTED-1234',
    notes: 'Corrected payment amount and mode after bank statement audit',
  }, { id: createdPaymentId });
  const editPayRes = createMockRes();
  await updatePayment(editPayReq, editPayRes);

  assert(editPayRes.statusCode === 200, 'PUT /api/payments/:id responded with 200 OK');
  assert(editPayRes.jsonPayload.success === true, 'Payment updated successfully');
  assert(
    partyBeforeBillEdit.currentBalance === round2(balBeforePay - 20000),
    `Party balance reduced by full corrected ₹20,000: ${partyBeforeBillEdit.currentBalance}`
  );

  // Verify getPaymentById retrieves the updated payment
  const getPayReq = createMockReq({}, { id: createdPaymentId });
  const getPayRes = createMockRes();
  await getPaymentById(getPayReq, getPayRes);
  assert(getPayRes.statusCode === 200, 'GET /api/payments/:id returned updated payment');
  assert(getPayRes.jsonPayload.payment.amountPaid === 20000, 'Payment amount verified as ₹20,000');
  assert(getPayRes.jsonPayload.payment.paymentMode === 'BANK_TRANSFER', 'Payment mode verified as BANK_TRANSFER');

  // Test 10.3: Delete Payment and verify party balance reverts back to original
  const deletePayReq = createMockReq({}, { id: createdPaymentId });
  const deletePayRes = createMockRes();
  await deletePayment(deletePayReq, deletePayRes);
  assert(deletePayRes.statusCode === 200, 'DELETE /api/payments/:id responded with 200 OK');
  assert(
    partyBeforeBillEdit.currentBalance === round2(balBeforePay),
    `Party balance reverted by ₹20,000 back to balBeforePay: ${partyBeforeBillEdit.currentBalance}`
  );

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test suite execution failed:', err);
  process.exit(1);
});
