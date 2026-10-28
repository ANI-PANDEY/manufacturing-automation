const mongoose = require('mongoose');
const HistoricalBill = require('../models/HistoricalBill');
const Transaction = require('../models/Transaction');
const Party = require('../models/Party');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');

/**
 * @desc Create / Migrate itemized historical bills and sync Bahi-Khata ledger
 * @route POST /api/migration/historical-bills
 */
const createHistoricalBills = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const userId = mongoose.Types.ObjectId.isValid(req.userId)
    ? new mongoose.Types.ObjectId(req.userId)
    : req.userId;

  try {
    let rawBills = [];
    let defaultPartyId = req.body.partyId || null;

    if (Array.isArray(req.body)) {
      rawBills = req.body;
    } else if (Array.isArray(req.body.bills)) {
      rawBills = req.body.bills;
    } else if (req.body && typeof req.body === 'object') {
      if (req.body.items && Array.isArray(req.body.items)) {
        rawBills = [req.body];
      }
    }

    if (!Array.isArray(rawBills) || rawBills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No bills provided. Please supply an array of historical bills or line items.',
      });
    }

    const savedBills = [];
    const createdTransactions = [];
    const affectedPartyIds = new Set();
    const errors = [];

    for (let i = 0; i < rawBills.length; i++) {
      const b = rawBills[i];
      const targetPartyId = b.partyId || defaultPartyId;
      const rawPartyName = b.partyName || b.customerName;

      // Locate or auto-create Party
      let party = null;
      if (targetPartyId) {
        if (isDbConnected && mongoose.Types.ObjectId.isValid(targetPartyId)) {
          party = await Party.findOne({ _id: targetPartyId, ...userFilter });
        }
        if (!party) {
          party = store.parties.find(
            (p) => (p._id === targetPartyId || p._id?.toString() === targetPartyId) && (req.isDemoAdmin || p.user === req.userId)
          );
        }
      }

      if (!party && rawPartyName && String(rawPartyName).trim()) {
        const cleanName = String(rawPartyName).trim();
        if (isDbConnected) {
          party = await Party.findOne({
            ...userFilter,
            name: { $regex: new RegExp(`^${cleanName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') },
          });
          if (!party) {
            party = new Party({
              user: userId,
              name: cleanName,
              phone: b.phone || '',
              type: 'CUSTOMER',
              currentBalance: 0,
              status: 'ACTIVE',
            });
            await party.save();
          }
        } else {
          party = store.parties.find(
            (p) => (p.name?.toLowerCase() === cleanName.toLowerCase()) && (req.isDemoAdmin || p.user === req.userId)
          );
          if (!party) {
            party = {
              _id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
              user: userId,
              name: cleanName,
              phone: b.phone || '',
              type: 'CUSTOMER',
              currentBalance: 0,
              status: 'ACTIVE',
              createdAt: new Date(),
            };
            store.parties.push(party);
          }
        }
      }

      if (!party) {
        errors.push({
          row: i + 1,
          bill: b,
          reason: 'Party / Customer could not be determined. Please provide a valid partyId or partyName.',
        });
        continue;
      }

      affectedPartyIds.add(party._id?.toString() || party.id);

      // Validate and compute items
      const rawItems = Array.isArray(b.items) && b.items.length > 0 ? b.items : [b];
      const processedItems = [];
      let calculatedSubtotal = 0;
      let totalBags = 0;
      let totalBillWeight = 0;

      for (let j = 0; j < rawItems.length; j++) {
        const it = rawItems[j];
        const desc = it.description || it.particulars || it.productName || it.name || 'Goods Invoiced';
        const bags = Number(it.bags) || 0;
        const qtyPerBag = round2(Number(it.qtyPerBag) || 0);

        let totalWeight = 0;
        if (bags > 0 && qtyPerBag > 0) {
          totalWeight = round2(bags * qtyPerBag);
        } else if (it.totalWeight !== undefined && Number(it.totalWeight) > 0) {
          totalWeight = round2(Number(it.totalWeight));
        } else if (bags > 0) {
          totalWeight = round2(bags);
        } else {
          totalWeight = 1;
        }

        const rate = round2(Number(it.rate !== undefined ? it.rate : (it.unitPrice || it.price)) || 0);
        let amount = round2(Number(it.amount !== undefined ? it.amount : totalWeight * rate) || 0);

        // Fallback if amount was 0 or rate was provided
        if (amount === 0 && rate > 0) {
          amount = round2(totalWeight * rate);
        }

        totalBags += bags;
        totalBillWeight = round2(totalBillWeight + totalWeight);
        calculatedSubtotal = round2(calculatedSubtotal + amount);

        processedItems.push({
          description: String(desc).trim(),
          bags,
          qtyPerBag,
          totalWeight,
          rate,
          amount,
        });
      }

      const finalSubTotal = calculatedSubtotal > 0 ? calculatedSubtotal : round2(Number(b.subTotal || b.totalAmount || 0));
      const rawPay = b.paymentReceived !== undefined ? b.paymentReceived : (b.paidAmount || b.paid || 0);
      const paymentReceived = round2(Math.max(0, Math.min(Number(rawPay) || 0, finalSubTotal)));
      const balanceDue = round2(Math.max(0, finalSubTotal - paymentReceived));

      let paymentStatus = 'UNPAID';
      if (balanceDue <= 0) {
        paymentStatus = 'PAID';
      } else if (paymentReceived > 0) {
        paymentStatus = 'PARTIAL';
      }

      const billDate = b.date || b.billDate ? new Date(b.date || b.billDate) : new Date();
      const rawRef = b.billNumber || b.invoiceNumber || b.refNo;
      const billNumber = rawRef && String(rawRef).trim()
        ? String(rawRef).trim().toUpperCase()
        : `HB-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      const billPayload = {
        user: userId,
        billNumber,
        partyId: party._id || party.id,
        date: billDate,
        items: processedItems,
        subTotal: finalSubTotal,
        paymentReceived,
        balanceDue,
        paymentStatus,
        notes: b.notes || `Migrated historical register bill (${totalBags} bags, ${totalBillWeight} kg)`,
      };

      let savedDoc = null;
      if (isDbConnected) {
        savedDoc = await HistoricalBill.create(billPayload);
      } else {
        savedDoc = {
          _id: `hb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          ...billPayload,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        if (!Array.isArray(store.historicalBills)) store.historicalBills = [];
        store.historicalBills.unshift(savedDoc);
      }

      savedBills.push(savedDoc);

      // 1. Ledger Entry for INVOICE (Debit)
      const invoiceTxPayload = {
        user: userId,
        partyId: party._id || party.id,
        date: billDate,
        type: 'INVOICE',
        debit: finalSubTotal,
        credit: 0,
        paymentMode: 'CASH',
        referenceId: billNumber,
        notes: `Historical bill #${billNumber} - ${processedItems.map((i) => i.description).join(', ')} (${totalBags} bags, ${totalBillWeight} kg)`,
      };

      if (isDbConnected) {
        const invTx = await Transaction.create(invoiceTxPayload);
        createdTransactions.push(invTx);
      } else {
        const memTx = {
          _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          ...invoiceTxPayload,
          createdAt: billDate,
        };
        if (!Array.isArray(store.transactions)) store.transactions = [];
        store.transactions.unshift(memTx);
        createdTransactions.push(memTx);
      }

      // 2. Ledger Entry for PAYMENT_RECEIVED if paymentReceived > 0 (Credit)
      if (paymentReceived > 0) {
        const paymentTxPayload = {
          user: userId,
          partyId: party._id || party.id,
          date: billDate,
          type: 'PAYMENT_RECEIVED',
          debit: 0,
          credit: paymentReceived,
          paymentMode: b.paymentMode ? String(b.paymentMode).toUpperCase() : 'CASH',
          referenceId: `RCP-${billNumber}`,
          notes: `Advance / past payment recorded at time of bill #${billNumber}`,
        };

        if (isDbConnected) {
          const payTx = await Transaction.create(paymentTxPayload);
          createdTransactions.push(payTx);
        } else {
          const memPayTx = {
            _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            ...paymentTxPayload,
            createdAt: billDate,
          };
          store.transactions.unshift(memPayTx);
          createdTransactions.push(memPayTx);
        }
      }

      // 3. Update Party Current Balance with pending due
      party.currentBalance = round2((party.currentBalance || 0) + balanceDue);
      if (isDbConnected && typeof party.save === 'function') {
        await party.save();
      }
      const memParty = store.parties.find((p) => (p._id || p.id)?.toString() === (party._id || party.id)?.toString());
      if (memParty) {
        memParty.currentBalance = round2(party.currentBalance);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Successfully migrated ${savedBills.length} historical itemized bill(s) with full ledger synchronization`,
      bills: savedBills,
      transactionsCount: createdTransactions.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error in createHistoricalBills:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get all itemized historical bills for a party sorted chronologically
 * @route GET /api/parties/:partyId/historical-bills
 */
const getPartyHistoricalBills = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const { partyId } = req.params;

  try {
    let bills = [];
    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      bills = await HistoricalBill.find({ partyId, ...userFilter })
        .populate('partyId', 'name phone address gstin')
        .sort({ date: -1, createdAt: -1 });
    } else {
      bills = (store.historicalBills || []).filter(
        (b) => (b.partyId?._id || b.partyId)?.toString() === partyId
      );
    }

    return res.json({
      success: true,
      count: bills.length,
      bills,
    });
  } catch (error) {
    console.error('Error in getPartyHistoricalBills:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Return structured invoice data formatted for printing / PDF invoice generation
 * @route GET /api/historical-bills/:billId/print-data
 */
const getHistoricalBillPrintData = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const { billId } = req.params;

  try {
    let bill = null;
    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(billId)) {
        bill = await HistoricalBill.findOne({ _id: billId, ...userFilter }).populate('partyId').lean();
      } else {
        bill = await HistoricalBill.findOne({ billNumber: billId, ...userFilter }).populate('partyId').lean();
      }
    }

    if (!bill) {
      bill = (store.historicalBills || []).find(
        (b) => b._id === billId || b.billNumber === billId
      );
      if (bill && bill.partyId) {
        const pObj = store.parties.find((p) => (p._id || p.id)?.toString() === (bill.partyId?._id || bill.partyId)?.toString());
        bill = { ...bill, partyId: pObj || bill.partyId };
      }
    }

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Historical bill not found' });
    }

    const party = bill.partyId || {};
    const items = bill.items || [];
    const totalBags = items.reduce((sum, it) => sum + (Number(it.bags) || 0), 0);
    const totalWeight = round2(items.reduce((sum, it) => sum + (Number(it.totalWeight) || 0), 0));

    const printData = {
      billId: bill._id,
      billNumber: bill.billNumber,
      date: bill.date,
      formattedDate: new Date(bill.date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      party: {
        id: party._id || party.id,
        name: party.name || 'Valued Customer',
        phone: party.phone || '',
        address: party.address || '',
        gstin: party.gstin || '',
        currentBalance: round2(party.currentBalance || 0),
      },
      items: items.map((it, idx) => ({
        srNo: idx + 1,
        description: it.description,
        bags: Number(it.bags) || 0,
        qtyPerBag: round2(Number(it.qtyPerBag) || 0),
        totalWeight: round2(Number(it.totalWeight) || 0),
        rate: round2(Number(it.rate) || 0),
        amount: round2(Number(it.amount) || 0),
      })),
      totalBags,
      totalWeight,
      subTotal: round2(bill.subTotal),
      paymentReceived: round2(bill.paymentReceived || 0),
      balanceDue: round2(bill.balanceDue),
      paymentStatus: bill.paymentStatus || (bill.balanceDue <= 0 ? 'PAID' : bill.paymentReceived > 0 ? 'PARTIAL' : 'UNPAID'),
      notes: bill.notes || '',
    };

    return res.json({ success: true, data: printData });
  } catch (error) {
    console.error('Error in getHistoricalBillPrintData:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createHistoricalBills,
  getPartyHistoricalBills,
  getHistoricalBillPrintData,
};
