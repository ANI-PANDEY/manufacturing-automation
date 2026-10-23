const mongoose = require('mongoose');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const Party = require('../models/Party');
const store = require('./inMemoryStore');
const { round2 } = require('./mathUtils');

/**
 * Builds a chronological Passbook Ledger for a given Party with 100% precision running balance
 */
const generatePartyLedger = async (partyId, startDate = null, endDate = null) => {
  let party = null;
  let rawOrders = [];
  let rawPayments = [];

  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

  if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
    party = await Party.findById(partyId).lean();
    if (party) {
      rawOrders = await Order.find({ party: partyId }).sort({ orderDate: 1 }).lean();
      rawPayments = await PaymentTransaction.find({ party: partyId }).sort({ paymentDate: 1 }).lean();
    }
  }

  if (!party) {
    party = store.parties.find((p) => p._id === partyId || p._id?.toString() === partyId);
    rawOrders = store.orders.filter((o) => (o.party?._id || o.party)?.toString() === partyId);
    rawPayments = store.payments.filter((p) => (p.party?._id || p.party)?.toString() === partyId);
  }

  if (!party) {
    throw new Error('Party not found');
  }

  const rawEvents = [];

  rawOrders.forEach((ord) => {
    rawEvents.push({
      id: ord._id.toString(),
      date: new Date(ord.orderDate),
      entryDate: new Date(ord.createdAt || ord.orderDate),
      type: 'DISPATCH',
      refNo: ord.orderNumber,
      debit: round2(ord.totalAmount),
      credit: 0,
      paymentStatus: ord.paymentStatus,
      paidAmount: round2(ord.paidAmount),
      balanceDue: round2(ord.balanceDue),
      notes: ord.dispatchNotes || `Invoice for ${ord.items?.length || 0} item(s)`,
      items: ord.items || [],
    });
  });

  rawPayments.forEach((pay) => {
    rawEvents.push({
      id: pay._id.toString(),
      date: new Date(pay.paymentDate),
      entryDate: new Date(pay.entryDate || pay.createdAt),
      type: 'PAYMENT',
      refNo: pay.receiptNumber,
      debit: 0,
      credit: round2(pay.amountPaid),
      paymentMode: pay.paymentMode,
      referenceNo: pay.referenceNo || 'N/A',
      allocationType: pay.allocationType,
      allocations: pay.allocations || [],
      notes: pay.notes ? `${pay.paymentMode} (${pay.referenceNo || 'Direct'}) - ${pay.notes}` : `${pay.paymentMode} (${pay.referenceNo || 'Direct'})`,
    });
  });

  // Sort chronologically by Payment Date / Value Date
  rawEvents.sort((a, b) => {
    const timeA = a.date.getTime();
    const timeB = b.date.getTime();
    if (timeA !== timeB) return timeA - timeB;
    if (a.type !== b.type) return a.type === 'DISPATCH' ? -1 : 1;
    return a.entryDate.getTime() - b.entryDate.getTime();
  });

  // Compute running balance with 100% precision
  let accumulatedBalance = 0;
  const processedEvents = rawEvents.map((evt) => {
    accumulatedBalance = round2(accumulatedBalance + evt.debit - evt.credit);
    return {
      ...evt,
      remainingBalance: round2(accumulatedBalance),
    };
  });

  let openingBalance = 0;
  let finalEvents = processedEvents;

  if (startDate) {
    const sDate = new Date(startDate);
    const priorEvents = processedEvents.filter((e) => e.date < sDate);
    if (priorEvents.length > 0) {
      openingBalance = round2(priorEvents[priorEvents.length - 1].remainingBalance);
    }
    finalEvents = processedEvents.filter((e) => e.date >= sDate);
  }

  if (endDate) {
    const eDate = new Date(endDate);
    eDate.setHours(23, 59, 59, 999);
    finalEvents = finalEvents.filter((e) => e.date <= eDate);
  }

  const totalDebit = round2(finalEvents.reduce((acc, curr) => acc + curr.debit, 0));
  const totalCredit = round2(finalEvents.reduce((acc, curr) => acc + curr.credit, 0));
  const closingBalance = round2(accumulatedBalance);

  return {
    party: {
      id: party._id,
      name: party.name,
      type: party.type,
      phone: party.phone,
      email: party.email,
      gstin: party.gstin,
      creditLimit: round2(party.creditLimit),
      currentBalance: round2(party.currentBalance),
    },
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    ledger: finalEvents,
  };
};

module.exports = {
  generatePartyLedger,
};
