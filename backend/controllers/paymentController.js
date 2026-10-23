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
      party = await Party.findById(partyId).session(session || null);
    }
    if (!party) {
      party = store.parties.find((p) => p._id === partyId || p._id?.toString() === partyId);
    }

    if (!party) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    const receiptNumber = `RCP-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const parsedPaymentDate = paymentDate ? new Date(paymentDate) : new Date();

    let unallocatedAmount = parsedAmountPaid;
    const allocations = [];

    // Mode 1: SPECIFIC ORDER ALLOCATION
    if (allocationType === 'SPECIFIC_ORDER' && targetOrderId) {
      let specificOrder = null;
      if (isDbConnected && mongoose.Types.ObjectId.isValid(targetOrderId)) {
        specificOrder = await Order.findById(targetOrderId).session(session || null);
      }
      if (!specificOrder) {
        specificOrder = store.orders.find((o) => o._id === targetOrderId || o._id?.toString() === targetOrderId);
      }

      if (specificOrder && specificOrder.balanceDue > 0) {
        const allocAmount = round2(Math.min(unallocatedAmount, specificOrder.balanceDue));
        specificOrder.paidAmount = round2(specificOrder.paidAmount + allocAmount);
        specificOrder.balanceDue = round2(specificOrder.balanceDue - allocAmount);
        specificOrder.paymentStatus = specificOrder.balanceDue <= 0 ? 'PAID' : 'PARTIAL';

        if (isDbConnected && typeof specificOrder.save === 'function') {
          await specificOrder.save({ session: session || null });
        }

        // Keep in-memory store.orders in sync
        const memSpecific = store.orders.find((o) => o._id?.toString() === specificOrder._id?.toString());
        if (memSpecific) {
          memSpecific.paidAmount = round2(specificOrder.paidAmount);
          memSpecific.balanceDue = round2(specificOrder.balanceDue);
          memSpecific.paymentStatus = specificOrder.paymentStatus;
        }

        allocations.push({
          order: specificOrder._id,
          orderNumber: specificOrder.orderNumber,
          amountAllocated: allocAmount,
        });

        unallocatedAmount = round2(unallocatedAmount - allocAmount);
      }
    }

    // Mode 2: FIFO ALLOCATION
    if (unallocatedAmount > 0) {
      let unpaidOrders = [];
      if (isValidPartyObjectId) {
        unpaidOrders = await Order.find({
          party: partyId,
          balanceDue: { $gt: 0 },
        })
          .sort({ orderDate: 1 })
          .session(session || null);
      }
      if (!unpaidOrders || unpaidOrders.length === 0) {
        unpaidOrders = store.orders
          .filter((o) => (o.party?._id || o.party)?.toString() === partyId && o.balanceDue > 0)
          .sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
      }

      for (const ord of unpaidOrders) {
        if (unallocatedAmount <= 0) break;

        const ordIdStr = ord._id?.toString() || ord._id;
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

    // Record Payment Transaction
    const transactionPayload = {
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

    // Update Party Balance (Current debit balance reduced by credit payment)
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
    const updatedLedger = await generatePartyLedger(partyId);

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
 * @desc Get payment transaction history for party
 * @route GET /api/payments/party/:partyId
 */
const getPartyPayments = async (req, res) => {
  try {
    const { partyId } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let payments = [];
    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      payments = await PaymentTransaction.find({ party: partyId })
        .populate('party', 'name gstin')
        .sort({ paymentDate: -1 });
    }
    if (!payments || payments.length === 0) {
      payments = store.payments.filter((p) => (p.party?._id || p.party)?.toString() === partyId);
    }

    return res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  receivePayment,
  getPartyPayments,
};

