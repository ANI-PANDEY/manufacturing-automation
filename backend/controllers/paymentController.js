const mongoose = require('mongoose');
const PaymentTransaction = require('../models/PaymentTransaction');
const Order = require('../models/Order');
const Party = require('../models/Party');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');
const { generatePartyLedger } = require('../utils/ledgerEngine');

/**
 * @desc Receive date-wise partial payment and reconcile ledger (FIFO or Specific Order)
 * @route POST /api/payments/receive
 */
const receivePayment = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const userId = mongoose.Types.ObjectId.isValid(req.userId)
    ? new mongoose.Types.ObjectId(req.userId)
    : req.userId;

  let session = null;
  if (isDbConnected) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (sErr) {
      session = null;
    }
  }

  try {
    const {
      partyId,
      paymentDate,
      amountPaid,
      paymentMode,
      referenceNo,
      allocationType = 'FIFO',
      targetOrderId,
      notes,
    } = req.body;

    const parsedAmountPaid = round2(amountPaid);

    if (!partyId || !parsedAmountPaid || parsedAmountPaid <= 0) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ success: false, message: 'Valid Party ID and Payment Amount (> ₹0) are required' });
    }

    let party = null;
    const isValidPartyObjectId = isDbConnected && mongoose.Types.ObjectId.isValid(partyId);

    if (isValidPartyObjectId) {
      party = await Party.findOne({ _id: partyId, ...userFilter }).session(session || null);
    }
    if (!party) {
      party = store.parties.find(
        (p) => (p._id === partyId || p._id?.toString() === partyId) && (req.isDemoAdmin || p.user === req.userId)
      );
    }

    if (!party) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    const parsedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();
    const receiptNumber = `RCP-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    let unallocatedAmount = parsedAmountPaid;
    const allocations = [];

    // Specific Order Allocation
    if (allocationType === 'SPECIFIC_ORDER' && targetOrderId) {
      let targetOrder = null;
      if (isDbConnected && mongoose.Types.ObjectId.isValid(targetOrderId)) {
        targetOrder = await Order.findOne({ _id: targetOrderId, party: partyId, ...userFilter }).session(session || null);
      }
      if (!targetOrder) {
        targetOrder = store.orders.find((o) => o._id === targetOrderId && (req.isDemoAdmin || o.user === req.userId));
      }

      if (targetOrder) {
        const allocAmount = round2(Math.min(unallocatedAmount, targetOrder.balanceDue));
        targetOrder.paidAmount = round2(targetOrder.paidAmount + allocAmount);
        targetOrder.balanceDue = round2(targetOrder.balanceDue - allocAmount);
        targetOrder.paymentStatus = targetOrder.balanceDue <= 0 ? 'PAID' : 'PARTIAL';

        if (isDbConnected && typeof targetOrder.save === 'function') {
          await targetOrder.save({ session: session || null });
        }

        // Sync in-memory store
        const memOrd = store.orders.find((o) => o._id === targetOrderId);
        if (memOrd) {
          memOrd.paidAmount = round2(targetOrder.paidAmount);
          memOrd.balanceDue = round2(targetOrder.balanceDue);
          memOrd.paymentStatus = targetOrder.paymentStatus;
        }

        allocations.push({
          order: targetOrder._id,
          orderNumber: targetOrder.orderNumber,
          amountAllocated: allocAmount,
        });

        unallocatedAmount = round2(unallocatedAmount - allocAmount);
      }
    }

    // FIFO Waterfall Allocation
    if (unallocatedAmount > 0) {
      let unpaidOrders = [];

      if (isDbConnected && isValidPartyObjectId) {
        unpaidOrders = await Order.find({
          party: partyId,
          paymentStatus: { $ne: 'PAID' },
          ...userFilter,
        })
          .sort({ orderDate: 1, createdAt: 1 })
          .session(session || null);
      }

      if (!unpaidOrders || unpaidOrders.length === 0) {
        unpaidOrders = store.orders.filter(
          (o) =>
            (o.party?._id || o.party)?.toString() === partyId &&
            o.paymentStatus !== 'PAID' &&
            (req.isDemoAdmin || o.user === req.userId)
        );
        unpaidOrders.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
      }

      for (const ord of unpaidOrders) {
        if (unallocatedAmount <= 0) break;

        const ordIdStr = ord._id?.toString() || ord.id;
        const existingAlloc = allocations.find((a) => (a.order?.toString() || a.order) === ordIdStr);
        if (existingAlloc && ord.balanceDue <= 0) continue;

        const allocAmount = round2(Math.min(unallocatedAmount, ord.balanceDue));
        ord.paidAmount = round2(ord.paidAmount + allocAmount);
        ord.balanceDue = round2(ord.balanceDue - allocAmount);
        ord.paymentStatus = ord.balanceDue <= 0 ? 'PAID' : 'PARTIAL';

        if (isDbConnected && typeof ord.save === 'function') {
          await ord.save({ session: session || null });
        }

        // Keep in-memory store.orders in sync
        const memOrd = store.orders.find((o) => o._id?.toString() === ordIdStr);
        if (memOrd) {
          memOrd.paidAmount = round2(ord.paidAmount);
          memOrd.balanceDue = round2(ord.balanceDue);
          memOrd.paymentStatus = ord.paymentStatus;
        }

        if (existingAlloc) {
          existingAlloc.amountAllocated = round2(existingAlloc.amountAllocated + allocAmount);
        } else {
          allocations.push({
            order: ord._id,
            orderNumber: ord.orderNumber,
            amountAllocated: allocAmount,
          });
        }

        unallocatedAmount = round2(unallocatedAmount - allocAmount);
      }
    }

    // Record Payment Transaction with user association
    const transactionPayload = {
      user: userId,
      receiptNumber,
      party: party._id || partyId,
      paymentDate: parsedPaymentDate,
      entryDate: new Date(),
      amountPaid: parsedAmountPaid,
      paymentMode: paymentMode || 'BANK_TRANSFER',
      referenceNo: referenceNo || '',
      allocationType,
      allocations,
      notes: notes || 'Partial payment received',
    };

    let newTransactionData = null;

    if (isValidPartyObjectId) {
      try {
        const newTransaction = new PaymentTransaction(transactionPayload);
        await newTransaction.save({ session: session || null });
        newTransactionData = newTransaction.toObject();
      } catch (txSaveErr) {
        console.warn('[Payment Transaction Save Fallback]:', txSaveErr.message);
      }
    }

    if (!newTransactionData) {
      newTransactionData = {
        _id: `pay_${Date.now()}`,
        ...transactionPayload,
        createdAt: new Date(),
      };
    }

    store.payments.push(newTransactionData);

    // Update Party Balance
    party.currentBalance = round2((party.currentBalance || 0) - parsedAmountPaid);

    if (isDbConnected && typeof party.save === 'function') {
      await party.save({ session: session || null });
    }

    // Always synchronize in-memory party store
    const memParty = store.parties.find((p) => p._id === partyId || p._id?.toString() === partyId);
    if (memParty) {
      memParty.currentBalance = round2(party.currentBalance);
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    // Generate accurate updated ledger
    const updatedLedger = await generatePartyLedger(partyId, null, null, userFilter);

    return res.status(201).json({
      success: true,
      message: 'Payment received & reconciled successfully',
      transaction: newTransactionData,
      ledgerSummary: updatedLedger,
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction().catch(() => {});
      session.endSession();
    }
    console.error('Error in receivePayment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get payment transaction history for party for the authenticated user
 * @route GET /api/payments/party/:partyId
 */
const getPartyPayments = async (req, res) => {
  try {
    const { partyId } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let payments = [];
    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      payments = await PaymentTransaction.find({ party: partyId, ...userFilter })
        .populate('party', 'name gstin')
        .sort({ paymentDate: -1 });
      return res.json({ success: true, count: payments.length, payments });
    }

    payments = store.payments.filter(
      (p) => (p.party?._id || p.party)?.toString() === partyId && (req.isDemoAdmin || p.user === req.userId)
    );

    return res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get all payment transactions for the authenticated user
 * @route GET /api/payments
 */
const getAllPayments = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let payments = [];
    if (isDbConnected) {
      payments = await PaymentTransaction.find(userFilter)
        .populate('party', 'name gstin')
        .sort({ paymentDate: -1 });
      return res.json({ success: true, count: payments.length, payments });
    }

    payments = store.payments.filter(
      (p) => req.isDemoAdmin || p.user === req.userId
    );

    return res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  receivePayment,
  getPartyPayments,
  getAllPayments,
};
