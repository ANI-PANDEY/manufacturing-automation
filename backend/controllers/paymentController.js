const mongoose = require('mongoose');
const PaymentTransaction = require('../models/PaymentTransaction');
const Transaction = require('../models/Transaction');
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
      date,
      amountPaid,
      amount,
      paymentMode,
      referenceNo,
      referenceId,
      allocationType = 'FIFO',
      targetOrderId,
      notes,
    } = req.body;

    const rawAmt = amountPaid !== undefined ? amountPaid : amount;
    const parsedAmountPaid = round2(Number(rawAmt));
    const finalPaymentDate = paymentDate || date;
    const finalReferenceNo = referenceNo || referenceId;

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

    const parsedPaymentDate = finalPaymentDate ? new Date(finalPaymentDate) : new Date();
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
      referenceNo: finalReferenceNo || '',
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

    // Mirror Transaction entry for double-entry ledger
    try {
      const mirrorTxPayload = {
        user: userId,
        partyId: party._id || partyId,
        date: parsedPaymentDate,
        type: 'PAYMENT_RECEIVED',
        debit: 0,
        credit: parsedAmountPaid,
        paymentMode: paymentMode || 'BANK_TRANSFER',
        referenceId: receiptNumber,
        notes: notes || 'Payment received',
      };
      if (isDbConnected && isValidPartyObjectId) {
        const mirrorTx = new Transaction(mirrorTxPayload);
        await mirrorTx.save({ session: session || null });
      }
      if (!Array.isArray(store.transactions)) store.transactions = [];
      store.transactions.unshift({
        _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        ...mirrorTxPayload,
        createdAt: new Date(),
      });
    } catch (mErr) {
      console.warn('[Mirror Tx Warning]:', mErr.message);
    }

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

/**
 * @desc Get payment transaction by ID or receiptNumber
 * @route GET /api/payments/:id
 */
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let payment = null;
    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        payment = await PaymentTransaction.findOne({ _id: id, ...userFilter }).populate('party').lean();
      }
      if (!payment) {
        payment = await PaymentTransaction.findOne({ receiptNumber: id, ...userFilter }).populate('party').lean();
      }
      if (!payment && mongoose.Types.ObjectId.isValid(id)) {
        // Fallback to Transaction model
        const tx = await Transaction.findOne({ _id: id, ...userFilter }).populate('partyId').lean();
        if (tx) {
          payment = {
            _id: tx._id,
            receiptNumber: tx.referenceId || `RCP-${tx._id}`,
            party: tx.partyId,
            paymentDate: tx.date,
            amountPaid: tx.credit,
            paymentMode: tx.paymentMode,
            referenceNo: tx.referenceId,
            notes: tx.notes,
          };
        }
      }
    }

    if (!payment) {
      payment = (store.payments || []).find(
        (p) => p._id === id || p.receiptNumber === id || p.referenceNo === id
      );
      if (!payment) {
        const tx = (store.transactions || []).find(
          (t) => t._id === id || t.referenceId === id
        );
        if (tx) {
          payment = {
            _id: tx._id,
            receiptNumber: tx.referenceId,
            party: tx.partyId,
            paymentDate: tx.date,
            amountPaid: tx.credit,
            paymentMode: tx.paymentMode,
            referenceNo: tx.referenceId,
            notes: tx.notes,
          };
        }
      }
      if (payment && payment.party) {
        const pObj = store.parties.find(
          (p) => (p._id || p.id)?.toString() === (payment.party?._id || payment.party)?.toString()
        );
        payment = { ...payment, party: pObj || payment.party };
      }
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    return res.json({ success: true, payment });
  } catch (error) {
    console.error('Error in getPaymentById:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Update / Edit an existing payment transaction and sync Bahi-Khata ledger & party balance
 * @route PUT /api/payments/:id
 */
const updatePayment = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const { id } = req.params;

  try {
    const {
      amountPaid,
      amount,
      paymentDate,
      date,
      paymentMode,
      referenceNo,
      referenceId,
      notes,
    } = req.body;

    const rawAmt = amountPaid !== undefined ? amountPaid : amount;
    const parsedAmountPaid = rawAmt !== undefined ? round2(Number(rawAmt)) : undefined;

    if (parsedAmountPaid !== undefined && (isNaN(parsedAmountPaid) || parsedAmountPaid <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Valid payment amount greater than ₹0 is required',
      });
    }

    let paymentDoc = null;
    let txDoc = null;

    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        paymentDoc = await PaymentTransaction.findOne({ _id: id, ...userFilter });
      }
      if (!paymentDoc) {
        paymentDoc = await PaymentTransaction.findOne({ receiptNumber: id, ...userFilter });
      }
      // Also locate linked Transaction
      if (paymentDoc) {
        txDoc = await Transaction.findOne({
          $or: [
            { referenceId: paymentDoc.receiptNumber },
            { referenceId: paymentDoc.referenceNo },
          ],
          ...userFilter,
        });
      }
      if (!paymentDoc && mongoose.Types.ObjectId.isValid(id)) {
        txDoc = await Transaction.findOne({ _id: id, ...userFilter });
      }
    }

    // In-memory lookup
    let memPayment = (store.payments || []).find(
      (p) => p._id === id || p.receiptNumber === id || p.referenceNo === id
    );
    let memTx = (store.transactions || []).find(
      (t) =>
        t._id === id ||
        t.referenceId === id ||
        (memPayment && (t.referenceId === memPayment.receiptNumber || t.referenceId === memPayment.referenceNo))
    );

    if (!paymentDoc && !txDoc && !memPayment && !memTx) {
      return res.status(404).json({ success: false, message: 'Payment record not found to edit' });
    }

    const partyId =
      paymentDoc?.party ||
      txDoc?.partyId ||
      memPayment?.party?._id ||
      memPayment?.party ||
      memTx?.partyId?._id ||
      memTx?.partyId;

    let party = null;
    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      party = await Party.findOne({ _id: partyId, ...userFilter });
    }
    if (!party) {
      party = store.parties.find(
        (p) => (p._id || p.id)?.toString() === partyId?.toString()
      );
    }

    const oldAmount = round2(
      paymentDoc?.amountPaid !== undefined
        ? paymentDoc.amountPaid
        : txDoc?.credit !== undefined
        ? txDoc.credit
        : memPayment?.amountPaid !== undefined
        ? memPayment.amountPaid
        : memTx?.credit || 0
    );

    const newAmount = parsedAmountPaid !== undefined ? parsedAmountPaid : oldAmount;
    const deltaAmount = round2(newAmount - oldAmount);

    const newPaymentDate = paymentDate || date ? new Date(paymentDate || date) : null;
    const newMode = paymentMode ? String(paymentMode).toUpperCase() : null;
    const newRef = referenceNo || referenceId;

    // Update Party current balance:
    // When payment increases (delta > 0), customer owes LESS (-deltaAmount)
    // When payment decreases (delta < 0), customer owes MORE (-deltaAmount = +abs)
    if (party && deltaAmount !== 0) {
      party.currentBalance = round2((party.currentBalance || 0) - deltaAmount);
      if (isDbConnected && typeof party.save === 'function') {
        await party.save();
      }
      const memParty = store.parties.find(
        (p) => (p._id || p.id)?.toString() === (party._id || party.id)?.toString()
      );
      if (memParty) {
        memParty.currentBalance = round2(party.currentBalance);
      }
    }

    // Update PaymentTransaction
    if (paymentDoc) {
      paymentDoc.amountPaid = newAmount;
      if (newPaymentDate) paymentDoc.paymentDate = newPaymentDate;
      if (newMode) paymentDoc.paymentMode = newMode;
      if (newRef) paymentDoc.referenceNo = newRef;
      if (notes !== undefined) paymentDoc.notes = notes;
      await paymentDoc.save();
    }

    if (memPayment) {
      memPayment.amountPaid = newAmount;
      if (newPaymentDate) memPayment.paymentDate = newPaymentDate;
      if (newMode) memPayment.paymentMode = newMode;
      if (newRef) memPayment.referenceNo = newRef;
      if (notes !== undefined) memPayment.notes = notes;
    }

    // Update Transaction
    if (txDoc) {
      txDoc.credit = newAmount;
      if (newPaymentDate) txDoc.date = newPaymentDate;
      if (newMode) txDoc.paymentMode = newMode;
      if (newRef) txDoc.referenceId = newRef;
      if (notes !== undefined) txDoc.notes = notes;
      await txDoc.save();
    }

    if (memTx) {
      memTx.credit = newAmount;
      if (newPaymentDate) memTx.date = newPaymentDate;
      if (newMode) memTx.paymentMode = newMode;
      if (newRef) memTx.referenceId = newRef;
      if (notes !== undefined) memTx.notes = notes;
    }

    return res.json({
      success: true,
      message: 'Payment updated and ledger synchronized successfully',
      payment: paymentDoc || memPayment || txDoc || memTx,
      partyBalance: party ? round2(party.currentBalance) : undefined,
    });
  } catch (error) {
    console.error('Error in updatePayment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete payment transaction and revert ledger & party balance
 * @route DELETE /api/payments/:id
 */
const deletePayment = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const { id } = req.params;

  try {
    let paymentDoc = null;
    let txDoc = null;

    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        paymentDoc = await PaymentTransaction.findOne({ _id: id, ...userFilter });
      }
      if (!paymentDoc) {
        paymentDoc = await PaymentTransaction.findOne({ receiptNumber: id, ...userFilter });
      }
      if (paymentDoc) {
        txDoc = await Transaction.findOne({
          $or: [
            { referenceId: paymentDoc.receiptNumber },
            { referenceId: paymentDoc.referenceNo },
          ],
          ...userFilter,
        });
      }
      if (!paymentDoc && mongoose.Types.ObjectId.isValid(id)) {
        txDoc = await Transaction.findOne({ _id: id, ...userFilter });
      }
    }

    let memPayment = (store.payments || []).find(
      (p) => p._id === id || p.receiptNumber === id || p.referenceNo === id
    );
    let memTx = (store.transactions || []).find(
      (t) =>
        t._id === id ||
        t.referenceId === id ||
        (memPayment && (t.referenceId === memPayment.receiptNumber || t.referenceId === memPayment.referenceNo))
    );

    if (!paymentDoc && !txDoc && !memPayment && !memTx) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    const partyId =
      paymentDoc?.party ||
      txDoc?.partyId ||
      memPayment?.party?._id ||
      memPayment?.party ||
      memTx?.partyId?._id ||
      memTx?.partyId;

    const oldAmount = round2(
      paymentDoc?.amountPaid !== undefined
        ? paymentDoc.amountPaid
        : txDoc?.credit !== undefined
        ? txDoc.credit
        : memPayment?.amountPaid !== undefined
        ? memPayment.amountPaid
        : memTx?.credit || 0
    );

    // Revert party balance: add back the deleted payment
    let party = null;
    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      party = await Party.findOne({ _id: partyId, ...userFilter });
    }
    if (!party) {
      party = store.parties.find(
        (p) => (p._id || p.id)?.toString() === partyId?.toString()
      );
    }

    if (party && oldAmount > 0) {
      party.currentBalance = round2((party.currentBalance || 0) + oldAmount);
      if (isDbConnected && typeof party.save === 'function') {
        await party.save();
      }
      const memParty = store.parties.find(
        (p) => (p._id || p.id)?.toString() === (party._id || party.id)?.toString()
      );
      if (memParty) {
        memParty.currentBalance = round2(party.currentBalance);
      }
    }

    // Delete documents
    if (paymentDoc) {
      await PaymentTransaction.deleteOne({ _id: paymentDoc._id });
    }
    if (txDoc) {
      await Transaction.deleteOne({ _id: txDoc._id });
    }

    store.payments = (store.payments || []).filter(
      (p) => p._id !== id && p.receiptNumber !== id && (memPayment ? p._id !== memPayment._id : true)
    );
    store.transactions = (store.transactions || []).filter(
      (t) =>
        t._id !== id &&
        t.referenceId !== id &&
        (memPayment ? t.referenceId !== memPayment.receiptNumber && t.referenceId !== memPayment.referenceNo : true)
    );

    return res.json({
      success: true,
      message: 'Payment deleted and party balance restored successfully',
      partyBalance: party ? round2(party.currentBalance) : undefined,
    });
  } catch (error) {
    console.error('Error in deletePayment:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  receivePayment,
  getPartyPayments,
  getAllPayments,
  getPaymentById,
  updatePayment,
  deletePayment,
};
