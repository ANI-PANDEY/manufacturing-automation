const mongoose = require('mongoose');
const Party = require('../models/Party');
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
          processedParties.push(existing.toObject());
          updatedCount++;
        } else {
          const newParty = new Party(partyPayload);
          await newParty.save();
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

module.exports = {
  getParties,
  createParty,
  bulkImportParties,
  getPartyById,
  getPartyLedger,
  deleteParty,
};
