const mongoose = require('mongoose');
const Party = require('../models/Party');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const PaymentTransaction = require('../models/PaymentTransaction');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');
const { generatePartyLedger } = require('../utils/ledgerEngine');

// Helper to normalize phone numbers to exactly 10 digits (removing +91, 0, or extra prefix)
const format10DigitPhone = (raw) => {
  if (!raw) return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(-10);
};

/**
 * @desc Get all parties for the authenticated user
 * @route GET /api/parties
 */
const getParties = async (req, res) => {
  try {
    const { type, status } = req.query;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let parties = [];
    if (isDbConnected) {
      const filter = { ...userFilter };
      if (type && type !== 'ALL') filter.type = type;
      if (status && status !== 'ALL') filter.status = status;
      parties = await Party.find(filter).sort({ name: 1 });
      return res.json({ success: true, count: parties.length, parties });
    }

    // Fallback to in-memory store ONLY when DB is offline
    parties = store.parties.filter((p) => {
      // In-memory tenant isolation: new users start completely empty
      if (!req.isDemoAdmin && p.user !== req.userId) return false;
      let match = true;
      if (type && p.type !== type && p.type !== 'BOTH') match = false;
      if (status && p.status !== status) match = false;
      return match;
    });

    return res.json({ success: true, count: parties.length, parties });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Create new party for the authenticated user
 * @route POST /api/parties
 */
const createParty = async (req, res) => {
  try {
    const {
      name,
      type,
      phone,
      email,
      address,
      gstin,
      creditLimit,
      openingBalance = 0,
      openingBalanceType = 'RECEIVABLE',
      openingBalanceDate,
    } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Party name is required' });
    }

    const userId = mongoose.Types.ObjectId.isValid(req.userId)
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    const openBal = round2(Number(openingBalance) || 0);
    const openType = String(openingBalanceType || '').toUpperCase() === 'PAYABLE' ? 'PAYABLE' : 'RECEIVABLE';
    const openDate = openingBalanceDate ? new Date(openingBalanceDate) : new Date();
    const initialBalance = openType === 'PAYABLE' ? -openBal : openBal;
    const cleanPhone = format10DigitPhone(phone);

    const partyPayload = {
      user: userId,
      name: name.trim(),
      type: type || 'CUSTOMER',
      phone: cleanPhone,
      email: email ? email.trim().toLowerCase() : '',
      address: address ? address.trim() : '',
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      creditLimit: round2(creditLimit || 500000),
      openingBalance: openBal,
      openingBalanceType: openType,
      openingBalanceDate: openDate,
      currentBalance: initialBalance,
      status: 'ACTIVE',
    };

    let partyData = null;

    if (isDbConnected) {
      const party = new Party(partyPayload);
      await party.save();
      partyData = party.toObject();
    } else {
      partyData = { _id: `p_${Date.now()}`, ...partyPayload, createdAt: new Date() };
    }

    // Always keep store.parties updated
    store.parties.push(partyData);

    return res.status(201).json({ success: true, party: partyData });
  } catch (error) {
    console.error('Error creating party:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Bulk import parties with opening balances from Excel / Manual sheet
 * @route POST /api/parties/bulk-import
 */
const bulkImportParties = async (req, res) => {
  try {
    const { parties = [] } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};
    const userId = mongoose.Types.ObjectId.isValid(req.userId)
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    if (!Array.isArray(parties) || parties.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No party records provided for import. Please supply an array of parties.',
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors = [];
    const processedParties = [];

    for (let i = 0; i < parties.length; i++) {
      const row = parties[i];
      const rawName = row.name || row.partyName || row.customerName || row.clientName;
      if (!rawName || !String(rawName).trim()) {
        failedCount++;
        errors.push({ row: i + 1, item: row, reason: 'Party / Customer name is missing' });
        continue;
      }

      const partyName = String(rawName).trim();
      const rawType = String(row.type || 'CUSTOMER').toUpperCase();
      const partyType = ['CUSTOMER', 'VENDOR', 'BOTH'].includes(rawType) ? rawType : 'CUSTOMER';
      const phone = format10DigitPhone(row.phone);
      const email = row.email ? String(row.email).trim().toLowerCase() : '';
      const address = row.address ? String(row.address).trim() : '';
      const gstin = row.gstin ? String(row.gstin).trim().toUpperCase() : '';
      const creditLimit = round2(Number(row.creditLimit) || 500000);

      const openBal = round2(Number(row.openingBalance !== undefined ? row.openingBalance : (row.balance || row.bakaya)) || 0);
      const rawBalType = String(row.openingBalanceType || row.balanceType || '').toUpperCase();
      const isPayable = rawBalType.includes('PAY') || rawBalType.includes('CREDIT') || rawBalType.includes('DENA');
      const openingBalanceType = isPayable ? 'PAYABLE' : 'RECEIVABLE';
      const initialBalance = isPayable ? -openBal : openBal;
      const openingBalanceDate = row.openingBalanceDate ? new Date(row.openingBalanceDate) : new Date();

      const partyPayload = {
        user: userId,
        name: partyName,
        type: partyType,
        phone,
        email,
        address,
        gstin,
        creditLimit,
        openingBalance: openBal,
        openingBalanceType,
        openingBalanceDate,
        currentBalance: initialBalance,
        status: 'ACTIVE',
      };

      if (isDbConnected) {
        // Find existing by name or gstin under this user
        const query = {
          ...userFilter,
          $or: [
            { name: { $regex: new RegExp(`^${partyName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
            ...(gstin ? [{ gstin }] : []),
          ],
        };
        let existing = await Party.findOne(query);
        if (existing) {
          if (phone) existing.phone = phone;
          if (email) existing.email = email;
          if (address) existing.address = address;
          if (gstin) existing.gstin = gstin;
          if (openBal > 0) {
            existing.openingBalance = openBal;
            existing.openingBalanceType = openingBalanceType;
            existing.openingBalanceDate = openingBalanceDate;
            existing.currentBalance = initialBalance;
          }
          await existing.save();
          if (openBal > 0) {
            await Transaction.deleteMany({ partyId: existing._id, type: 'OPENING_BALANCE', ...userFilter });
            await Transaction.create({
              user: userId,
              partyId: existing._id,
              date: openingBalanceDate,
              type: 'OPENING_BALANCE',
              debit: isPayable ? 0 : openBal,
              credit: isPayable ? openBal : 0,
              paymentMode: 'CASH',
              referenceId: 'OPEN-BAL',
              notes: `Opening Balance (${openingBalanceType}) migrated from ledger`,
            });
          }
          processedParties.push(existing.toObject());
          updatedCount++;
        } else {
          const newParty = new Party(partyPayload);
          await newParty.save();
          if (openBal > 0) {
            await Transaction.create({
              user: userId,
              partyId: newParty._id,
              date: openingBalanceDate,
              type: 'OPENING_BALANCE',
              debit: isPayable ? 0 : openBal,
              credit: isPayable ? openBal : 0,
              paymentMode: 'CASH',
              referenceId: 'OPEN-BAL',
              notes: `Opening Balance (${openingBalanceType}) migrated from ledger`,
            });
          }
          processedParties.push(newParty.toObject());
          createdCount++;
        }
      } else {
        // In-memory fallback
        let memIndex = store.parties.findIndex(
          (p) => (req.isDemoAdmin || p.user === req.userId) &&
                 (p.name?.toLowerCase() === partyName.toLowerCase() || (gstin && p.gstin === gstin))
        );
        if (memIndex !== -1) {
          store.parties[memIndex] = {
            ...store.parties[memIndex],
            phone: phone || store.parties[memIndex].phone,
            email: email || store.parties[memIndex].email,
            address: address || store.parties[memIndex].address,
            gstin: gstin || store.parties[memIndex].gstin,
            openingBalance: openBal || store.parties[memIndex].openingBalance,
            openingBalanceType: openingBalanceType || store.parties[memIndex].openingBalanceType,
            openingBalanceDate,
            currentBalance: openBal > 0 ? initialBalance : store.parties[memIndex].currentBalance,
          };
          processedParties.push(store.parties[memIndex]);
          updatedCount++;
        } else {
          const newMemParty = {
            _id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            ...partyPayload,
            createdAt: new Date(),
          };
          store.parties.push(newMemParty);
          processedParties.push(newMemParty);
          createdCount++;
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${parties.length} party records: ${createdCount} created, ${updatedCount} updated, ${failedCount} skipped.`,
      stats: {
        total: parties.length,
        created: createdCount,
        updated: updatedCount,
        failed: failedCount,
      },
      errors,
      parties: processedParties,
    });
  } catch (error) {
    console.error('Error in bulkImportParties:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get single party details
 * @route GET /api/parties/:id
 */
const getPartyById = async (req, res) => {
  try {
    const { id } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};
    let party = null;

    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        party = await Party.findOne({ _id: id, ...userFilter });
      } else {
        party = await Party.findOne({ name: id, ...userFilter });
      }
    }

    if (!party) {
      party = store.parties.find(
        (p) => (p._id?.toString() === id || p.id === id || p.name === id) && (req.isDemoAdmin || p.user === req.userId)
      );
    }

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }
    return res.json({ success: true, party });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get Date-wise Party Ledger Passbook
 * @route GET /api/parties/:id/ledger
 */
const getPartyLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const ledgerData = await generatePartyLedger(id, startDate, endDate, req.userFilter);
    return res.json({ success: true, data: ledgerData });
  } catch (error) {
    console.error('Error fetching party ledger:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete / Remove party
 * @route DELETE /api/parties/:id
 */
const deleteParty = async (req, res) => {
  try {
    const { id } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Party.findOneAndDelete({ _id: id, ...userFilter });
      } else {
        await Party.deleteOne({ _id: id, ...userFilter });
      }
    }

    // Always remove from in-memory store as well
    store.parties = store.parties.filter((p) => p._id?.toString() !== id && p.id !== id);

    return res.json({
      success: true,
      message: 'Customer/Party account removed successfully',
      removedId: id,
    });
  } catch (error) {
    console.error('Error deleting party:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Bulk migrate parties from paper ledger & generate OPENING_BALANCE ledger transactions
 * @route POST /api/parties/migrate-bulk
 */
const migrateBulkParties = async (req, res) => {
  try {
    const rawList = Array.isArray(req.body) ? req.body : req.body.parties || [];
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};
    const userId = mongoose.Types.ObjectId.isValid(req.userId)
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No party records provided. Please supply an array of parties.',
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors = [];
    const processedParties = [];
    const processedTransactions = [];

    for (let i = 0; i < rawList.length; i++) {
      const row = rawList[i];
      const rawName = row.name || row.partyName || row.customerName || row.clientName;
      if (!rawName || !String(rawName).trim()) {
        failedCount++;
        errors.push({ row: i + 1, item: row, reason: 'Party/Customer name is required' });
        continue;
      }

      const partyName = String(rawName).trim();
      const rawType = String(row.type || 'CUSTOMER').toUpperCase();
      const partyType = ['CUSTOMER', 'VENDOR', 'BOTH'].includes(rawType) ? rawType : 'CUSTOMER';
      const phone = format10DigitPhone(row.phone);
      const email = row.email ? String(row.email).trim().toLowerCase() : '';
      const address = row.address ? String(row.address).trim() : '';
      const gstin = row.gstin ? String(row.gstin).trim().toUpperCase() : '';
      const creditLimit = round2(Number(row.creditLimit) || 0);

      // Opening Balance parsing
      const rawBal = row.openingBalance !== undefined ? row.openingBalance : (row.balance || row.bakaya || 0);
      const openBal = round2(Math.abs(Number(rawBal) || 0));

      const rawBalType = String(row.openingBalanceType || row.balanceType || 'TO_RECEIVE').toUpperCase();
      const isPayable =
        rawBalType.includes('PAY') ||
        rawBalType.includes('CREDIT') ||
        rawBalType.includes('DENA') ||
        rawBalType === 'TO_PAY';
      const openingBalanceType = isPayable ? 'TO_PAY' : 'TO_RECEIVE';
      const initialBalance = isPayable ? -openBal : openBal;
      const openingBalanceDate = row.openingBalanceDate ? new Date(row.openingBalanceDate) : new Date();

      const partyPayload = {
        user: userId,
        name: partyName,
        type: partyType,
        phone,
        email,
        address,
        gstin,
        creditLimit,
        openingBalance: openBal,
        openingBalanceType,
        openingBalanceDate,
        currentBalance: initialBalance,
        status: 'ACTIVE',
      };

      let savedParty = null;

      if (isDbConnected) {
        const query = {
          ...userFilter,
          $or: [
            { name: { $regex: new RegExp(`^${partyName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } },
            ...(phone ? [{ phone }] : []),
          ],
        };

        let existing = await Party.findOne(query);
        if (existing) {
          if (phone) existing.phone = phone;
          if (email) existing.email = email;
          if (address) existing.address = address;
          if (gstin) existing.gstin = gstin;
          existing.openingBalance = openBal;
          existing.openingBalanceType = openingBalanceType;
          existing.openingBalanceDate = openingBalanceDate;
          existing.currentBalance = initialBalance;
          if (creditLimit > 0) existing.creditLimit = creditLimit;

          await existing.save();
          savedParty = existing.toObject();
          updatedCount++;
        } else {
          const newParty = new Party(partyPayload);
          await newParty.save();
          savedParty = newParty.toObject();
          createdCount++;
        }

        // Generate 'OPENING_BALANCE' transaction in the ledger collection
        if (openBal > 0) {
          // Remove any prior OPENING_BALANCE for this party to prevent duplicates
          await Transaction.deleteMany({
            partyId: savedParty._id,
            type: 'OPENING_BALANCE',
            ...userFilter,
          });

          const tx = new Transaction({
            user: userId,
            partyId: savedParty._id,
            date: openingBalanceDate,
            type: 'OPENING_BALANCE',
            debit: isPayable ? 0 : openBal,
            credit: isPayable ? openBal : 0,
            paymentMode: 'CASH',
            referenceId: 'OPEN-BAL',
            notes: `Pen-and-paper ledger opening balance (${isPayable ? 'To Pay (Dena)' : 'To Receive (Lena)'})`,
          });
          await tx.save();
          processedTransactions.push(tx.toObject());
        }
      } else {
        // In-memory fallback
        let memIndex = store.parties.findIndex(
          (p) =>
            (req.isDemoAdmin || p.user === req.userId) &&
            (p.name?.toLowerCase() === partyName.toLowerCase() || (phone && p.phone === phone))
        );
        if (memIndex !== -1) {
          store.parties[memIndex] = {
            ...store.parties[memIndex],
            phone: phone || store.parties[memIndex].phone,
            openingBalance: openBal,
            openingBalanceType,
            openingBalanceDate,
            currentBalance: initialBalance,
            creditLimit: creditLimit || store.parties[memIndex].creditLimit,
          };
          savedParty = store.parties[memIndex];
          updatedCount++;
        } else {
          savedParty = {
            _id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            ...partyPayload,
            createdAt: new Date(),
          };
          store.parties.push(savedParty);
          createdCount++;
        }

        if (openBal > 0) {
          if (!Array.isArray(store.transactions)) store.transactions = [];
          store.transactions = store.transactions.filter(
            (t) => !(t.partyId?.toString() === savedParty._id?.toString() && t.type === 'OPENING_BALANCE')
          );
          const memTx = {
            _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            user: userId,
            partyId: savedParty._id,
            date: openingBalanceDate,
            type: 'OPENING_BALANCE',
            debit: isPayable ? 0 : openBal,
            credit: isPayable ? openBal : 0,
            paymentMode: 'CASH',
            referenceId: 'OPEN-BAL',
            notes: `Pen-and-paper ledger opening balance (${isPayable ? 'To Pay' : 'To Receive'})`,
            createdAt: new Date(),
          };
          store.transactions.push(memTx);
          processedTransactions.push(memTx);
        }
      }

      processedParties.push(savedParty);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully migrated ${createdCount + updatedCount} parties into ledger (${createdCount} added, ${updatedCount} updated, ${failedCount} skipped)`,
      stats: {
        total: rawList.length,
        created: createdCount,
        updated: updatedCount,
        failed: failedCount,
      },
      parties: processedParties,
      transactions: processedTransactions,
      errors,
    });
  } catch (error) {
    console.error('Error in migrateBulkParties:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get complete Bahi-Khata ledger summary with Total Payable, Total Received, Remaining Balance
 * @route GET /api/parties/:partyId/ledger-summary
 */
const getPartyLedgerSummary = async (req, res) => {
  try {
    const { partyId } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let party = null;
    let transactions = [];
    let orders = [];
    let payments = [];

    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      party = await Party.findOne({ _id: partyId, ...userFilter }).lean();
      if (party) {
        transactions = await Transaction.find({ partyId: party._id, ...userFilter })
          .sort({ date: 1, createdAt: 1 })
          .lean();
        orders = await Order.find({ party: party._id, ...userFilter }).sort({ orderDate: 1 }).lean();
        payments = await PaymentTransaction.find({ party: party._id, ...userFilter }).sort({ paymentDate: 1 }).lean();
      }
    }

    if (!party) {
      party = store.parties.find(
        (p) =>
          (p._id?.toString() === partyId || p.id === partyId || p.name === partyId) &&
          (req.isDemoAdmin || p.user === req.userId)
      );
      if (party) {
        transactions = (store.transactions || []).filter(
          (t) => (t.partyId?._id || t.partyId)?.toString() === party._id?.toString()
        );
        orders = (store.orders || []).filter((o) => (o.party?._id || o.party)?.toString() === party._id?.toString());
        payments = (store.payments || []).filter(
          (p) => (p.party?._id || p.party)?.toString() === party._id?.toString()
        );
      }
    }

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    // Merge transactions, orders, and payments into a unified ledger stream
    const eventsMap = new Map();

    // 1. Existing Transaction documents (the primary source of truth)
    transactions.forEach((tx) => {
      const key = `${tx.type}_${tx.referenceId || tx._id}`;
      eventsMap.set(key, {
        id: tx._id?.toString(),
        date: new Date(tx.date || tx.createdAt),
        type: tx.type,
        debit: round2(tx.debit || 0),
        credit: round2(tx.credit || 0),
        paymentMode: tx.paymentMode || 'CASH',
        referenceId: tx.referenceId || '',
        notes: tx.notes || '',
      });
    });

    // 2. Synthesize Opening Balance if not already in eventsMap
    const openBal = round2(party.openingBalance || 0);
    const hasOpeningTx = Array.from(eventsMap.values()).some((e) => e.type === 'OPENING_BALANCE');
    if (!hasOpeningTx && openBal > 0) {
      const isPayable = party.openingBalanceType === 'TO_PAY' || party.openingBalanceType === 'PAYABLE';
      eventsMap.set('OPENING_BALANCE_synth', {
        id: `open_${party._id}`,
        date: party.openingBalanceDate ? new Date(party.openingBalanceDate) : new Date(party.createdAt || Date.now()),
        type: 'OPENING_BALANCE',
        debit: isPayable ? 0 : openBal,
        credit: isPayable ? openBal : 0,
        paymentMode: 'CASH',
        referenceId: 'OPEN-BAL',
        notes: `Opening Balance (${isPayable ? 'To Pay' : 'To Receive'})`,
      });
    }

    // 3. Sync any orders not in eventsMap as INVOICE
    orders.forEach((ord) => {
      const invoiceKey = `INVOICE_${ord.orderNumber}`;
      if (!eventsMap.has(invoiceKey)) {
        eventsMap.set(invoiceKey, {
          id: ord._id?.toString(),
          date: new Date(ord.orderDate || ord.createdAt),
          type: 'INVOICE',
          debit: round2(ord.totalAmount || 0),
          credit: 0,
          paymentMode: 'N/A',
          referenceId: ord.orderNumber,
          notes: ord.dispatchNotes || `Sales Invoice #${ord.orderNumber}`,
        });
      }
    });

    // 4. Sync any paymentTransactions not in eventsMap as PAYMENT_RECEIVED
    payments.forEach((pay) => {
      const payKey = `PAYMENT_RECEIVED_${pay.receiptNumber}`;
      if (!eventsMap.has(payKey)) {
        eventsMap.set(payKey, {
          id: pay._id?.toString(),
          date: new Date(pay.paymentDate || pay.entryDate || pay.createdAt),
          type: 'PAYMENT_RECEIVED',
          debit: 0,
          credit: round2(pay.amountPaid || 0),
          paymentMode: pay.paymentMode || 'BANK_TRANSFER',
          referenceId: pay.receiptNumber,
          notes: pay.notes || `Payment received via ${pay.paymentMode}`,
        });
      }
    });

    // Sort chronologically by date
    const allEvents = Array.from(eventsMap.values()).sort((a, b) => {
      const timeDiff = a.date.getTime() - b.date.getTime();
      if (timeDiff !== 0) return timeDiff;
      if (a.type === 'OPENING_BALANCE') return -1;
      if (b.type === 'OPENING_BALANCE') return 1;
      return 0;
    });

    // Compute dynamic running balance with 2-decimal precision
    let runningBalance = 0;
    let totalPayable = 0; // All debits (opening balance if receivable + invoice debits)
    let totalReceived = 0; // All credits (payments received + opening balance if payable)

    const ledger = allEvents.map((evt) => {
      runningBalance = round2(runningBalance + evt.debit - evt.credit);
      totalPayable = round2(totalPayable + evt.debit);
      totalReceived = round2(totalReceived + evt.credit);
      return {
        ...evt,
        runningBalance: round2(runningBalance),
      };
    });

    const remainingBalance = round2(totalPayable - totalReceived);

    // Status: PAID if <= 0, PARTIAL if some payment received, UNPAID if no payment received yet
    let status = 'UNPAID';
    if (remainingBalance <= 0) {
      status = 'PAID';
    } else if (totalReceived > 0) {
      status = 'PARTIAL';
    }

    return res.json({
      success: true,
      data: {
        party: {
          _id: party._id,
          name: party.name,
          phone: party.phone,
          email: party.email,
          address: party.address,
          gstin: party.gstin,
          type: party.type,
          creditLimit: round2(party.creditLimit || 0),
          openingBalance: round2(party.openingBalance || 0),
          openingBalanceType: party.openingBalanceType || 'TO_RECEIVE',
          currentBalance: remainingBalance,
        },
        totalPayable: round2(totalPayable),
        totalReceived: round2(totalReceived),
        remainingBalance: round2(remainingBalance),
        status,
        ledger,
      },
    });
  } catch (error) {
    console.error('Error in getPartyLedgerSummary:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getParties,
  createParty,
  bulkImportParties,
  migrateBulkParties,
  getPartyById,
  getPartyLedger,
  getPartyLedgerSummary,
  deleteParty,
};

