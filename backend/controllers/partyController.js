const mongoose = require('mongoose');
const Party = require('../models/Party');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');
const { generatePartyLedger } = require('../utils/ledgerEngine');

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
    const { name, type, phone, email, address, gstin, creditLimit } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Party name is required' });
    }

    const userId = mongoose.Types.ObjectId.isValid(req.userId)
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    const partyPayload = {
      user: userId,
      name: name.trim(),
      type: type || 'CUSTOMER',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim().toLowerCase() : '',
      address: address ? address.trim() : '',
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      creditLimit: round2(creditLimit || 500000),
      currentBalance: 0,
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
  getPartyById,
  getPartyLedger,
  deleteParty,
};
