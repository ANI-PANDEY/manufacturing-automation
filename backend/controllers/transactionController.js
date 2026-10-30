const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Party = require('../models/Party');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');

/**
 * @desc Record an incoming payment against a party and reflect in Bahi-Khata ledger
 * @route POST /api/transactions/receive-payment
 */
const receivePayment = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const userId = mongoose.Types.ObjectId.isValid(req.userId)
    ? new mongoose.Types.ObjectId(req.userId)
    : req.userId;

  try {
    const {
      partyId,
      amount,
      amountPaid, // Support both field names
      paymentMode = 'CASH',
      referenceId,
      referenceNo,
      notes,
      date,
      paymentDate,
    } = req.body;

    const rawAmount = amount !== undefined ? amount : amountPaid;
    const parsedAmount = round2(Number(rawAmount));

    if (!partyId) {
      return res.status(400).json({ success: false, message: 'Party ID is required' });
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid payment amount greater than ₹0 is required',
      });
    }

    // Validate Payment Mode
    const validModes = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'];
    const cleanMode = String(paymentMode).trim().toUpperCase();
    const finalPaymentMode = validModes.includes(cleanMode) ? cleanMode : 'CASH';

    // Find party
    let party = null;
    const isValidPartyId = isDbConnected && mongoose.Types.ObjectId.isValid(partyId);

    if (isValidPartyId) {
      party = await Party.findOne({ _id: partyId, ...userFilter });
    }
    if (!party) {
      party = store.parties.find(
        (p) => (p._id === partyId || p._id?.toString() === partyId) && (req.isDemoAdmin || p.user === req.userId)
      );
    }

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party / Customer not found' });
    }

    const txDate = date || paymentDate ? new Date(date || paymentDate) : new Date();
    const refCode = referenceId || referenceNo || `RCP-${Date.now().toString().slice(-6)}`;
    const txNotes = notes ? String(notes).trim() : `Payment received via ${finalPaymentMode}`;

    // 1. Create Ledger Transaction (Credit = Client ne jama kiya)
    const transactionPayload = {
      user: userId,
      partyId: party._id || party.id,
      date: txDate,
      type: 'PAYMENT_RECEIVED',
      debit: 0,
      credit: parsedAmount,
      paymentMode: finalPaymentMode,
      referenceId: refCode,
      notes: txNotes,
    };

    let newTransaction = null;
    if (isDbConnected) {
      const txDoc = new Transaction(transactionPayload);
      await txDoc.save();
      newTransaction = txDoc.toObject();
    } else {
      newTransaction = {
        _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...transactionPayload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (!Array.isArray(store.transactions)) store.transactions = [];
      store.transactions.unshift(newTransaction);
    }

    // 2. Update Party Running Balance
    // Reducing outstanding balance: currentBalance = currentBalance - amount
    party.currentBalance = round2((party.currentBalance || 0) - parsedAmount);
    if (isDbConnected && typeof party.save === 'function') {
      await party.save();
    }
    const memParty = store.parties.find((p) => (p._id || p.id)?.toString() === (party._id || party.id)?.toString());
    if (memParty) {
      memParty.currentBalance = round2(party.currentBalance);
    }

    // 3. FIFO Reconcile with open orders (if any) to keep dispatches in sync
    let openOrders = [];
    if (isDbConnected && isValidPartyId) {
      openOrders = await Order.find({
        party: party._id,
        paymentStatus: { $in: ['UNPAID', 'PARTIAL'] },
        ...userFilter,
      }).sort({ orderDate: 1 });
    } else {
      openOrders = store.orders
        .filter(
          (o) =>
            (o.party?._id || o.party)?.toString() === (party._id || party.id)?.toString() &&
            ['UNPAID', 'PARTIAL'].includes(o.paymentStatus)
        )
        .sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
    }

    let unallocated = parsedAmount;
    const allocations = [];

    for (const ord of openOrders) {
      if (unallocated <= 0) break;
      const due = round2(ord.balanceDue || 0);
      if (due <= 0) continue;

      const alloc = round2(Math.min(unallocated, due));
      ord.paidAmount = round2((ord.paidAmount || 0) + alloc);
      ord.balanceDue = round2(due - alloc);
      ord.paymentStatus = ord.balanceDue <= 0 ? 'PAID' : 'PARTIAL';

      if (isDbConnected && typeof ord.save === 'function') {
        await ord.save();
      }

      allocations.push({
        order: ord._id,
        orderNumber: ord.orderNumber,
        amountAllocated: alloc,
      });

      unallocated = round2(unallocated - alloc);
    }

    // 4. Create mirror record in PaymentTransaction model for backward compatibility
    try {
      const receiptPayload = {
        user: userId,
        receiptNumber: refCode,
        party: party._id || party.id,
        paymentDate: txDate,
        amountPaid: parsedAmount,
        paymentMode: finalPaymentMode,
        referenceNo: refCode,
        allocationType: 'FIFO',
        allocations,
        notes: txNotes,
      };

      if (isDbConnected) {
        await PaymentTransaction.create(receiptPayload);
      } else {
        store.payments.unshift({
          _id: `pay_${Date.now()}`,
          ...receiptPayload,
          createdAt: new Date(),
        });
      }
    } catch (e) {
      console.warn('[PaymentTransaction mirror sync non-fatal warning]:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${parsedAmount.toLocaleString('en-IN')} received successfully from ${party.name}`,
      transaction: newTransaction,
      party: {
        _id: party._id || party.id,
        name: party.name,
        currentBalance: round2(party.currentBalance),
      },
      allocations,
    });
  } catch (error) {
    console.error('Error in receivePayment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get all transactions for a specific party
 * @route GET /api/transactions/party/:partyId
 */
const getPartyTransactions = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const { partyId } = req.params;

  try {
    let transactions = [];
    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      transactions = await Transaction.find({ partyId, ...userFilter }).sort({ date: 1, createdAt: 1 });
    } else {
      transactions = (store.transactions || []).filter(
        (t) => (t.partyId?._id || t.partyId)?.toString() === partyId
      );
    }

    return res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const { updatePayment, deletePayment, getPaymentById } = require('./paymentController');

module.exports = {
  receivePayment,
  getPartyTransactions,
  updateTransaction: updatePayment,
  deleteTransaction: deletePayment,
  getTransactionById: getPaymentById,
};

