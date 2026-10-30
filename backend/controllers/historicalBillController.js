const mongoose = require('mongoose');
const HistoricalBill = require('../models/HistoricalBill');
const Order = require('../models/Order');
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

/**
 * @desc Get historical bill by ID or billNumber
 * @route GET /api/historical-bills/:billId
 */
const getHistoricalBillById = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const { billId } = req.params;

  try {
    let bill = null;
    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(billId)) {
        bill = await HistoricalBill.findOne({ _id: billId, ...userFilter }).populate('partyId').lean();
      }
      if (!bill) {
        bill = await HistoricalBill.findOne({ billNumber: billId, ...userFilter }).populate('partyId').lean();
      }
    }

    if (!bill) {
      bill = (store.historicalBills || []).find(
        (b) => b._id === billId || b.billNumber === billId
      );
      if (bill && bill.partyId) {
        const pObj = store.parties.find(
          (p) => (p._id || p.id)?.toString() === (bill.partyId?._id || bill.partyId)?.toString()
        );
        bill = { ...bill, partyId: pObj || bill.partyId };
      }
    }

    if (!bill && isDbConnected) {
      const order = await Order.findOne({
        $or: [
          { orderNumber: billId },
          ...(mongoose.Types.ObjectId.isValid(billId) ? [{ _id: billId }] : []),
        ],
        ...userFilter,
      }).populate('party').lean();

      if (order) {
        bill = {
          _id: order._id,
          billNumber: order.orderNumber,
          billDate: order.orderDate || order.createdAt,
          partyId: order.party,
          partyName: order.party?.name || '',
          subTotal: order.totalAmount || order.subtotalAmount || 0,
          paymentReceived: 0,
          balanceDue: order.totalAmount || 0,
          notes: order.dispatchNotes || `Order #${order.orderNumber}`,
          items: (order.items || []).map((it, idx) => ({
            id: it._id || idx + 1,
            description: it.product?.name || it.productName || 'Goods Invoiced',
            bags: 0,
            qtyPerBag: 0,
            totalWeight: it.quantity || 1,
            rate: it.unitPrice || 0,
            amount: it.totalPrice || round2((it.quantity || 1) * (it.unitPrice || 0)),
          })),
        };
      }
    }

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Historical bill not found' });
    }

    return res.json({ success: true, bill });
  } catch (error) {
    console.error('Error in getHistoricalBillById:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Update / Edit an existing historical bill, adjust party balance, and sync ledger transactions
 * @route PUT /api/historical-bills/:billId
 */
const updateHistoricalBill = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const { billId } = req.params;

  try {
    let bill = null;
    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(billId)) {
        bill = await HistoricalBill.findOne({ _id: billId, ...userFilter });
      }
      if (!bill) {
        bill = await HistoricalBill.findOne({ billNumber: billId, ...userFilter });
      }
    }

    let memBill = (store.historicalBills || []).find(
      (b) => b._id === billId || b.billNumber === billId
    );

    if (!bill && !memBill && isDbConnected) {
      const order = await Order.findOne({
        $or: [
          { orderNumber: billId },
          ...(mongoose.Types.ObjectId.isValid(billId) ? [{ _id: billId }] : []),
        ],
        ...userFilter,
      });
      if (order) {
        const oldTotal = round2(order.totalAmount || 0);
        const newTotal = req.body.subTotal !== undefined && !isNaN(Number(req.body.subTotal))
          ? round2(Number(req.body.subTotal))
          : oldTotal;
        const delta = round2(newTotal - oldTotal);
        order.totalAmount = newTotal;
        if (req.body.notes !== undefined) order.dispatchNotes = req.body.notes;
        if (req.body.date) order.orderDate = new Date(req.body.date);
        await order.save();
        if (delta !== 0) {
          const party = await Party.findOne({ _id: order.party, ...userFilter });
          if (party) {
            party.currentBalance = round2((party.currentBalance || 0) + delta);
            await party.save();
          }
          await Transaction.updateMany(
            { referenceId: order.orderNumber, type: 'INVOICE', ...userFilter },
            { debit: newTotal }
          );
        }
        return res.json({
          success: true,
          message: `Invoice #${order.orderNumber} updated successfully`,
          bill: order,
        });
      }
    }

    if (!bill && !memBill) {
      return res.status(404).json({ success: false, message: 'Historical bill not found to edit' });
    }

    const targetDoc = bill || memBill;
    const oldBillNumber = targetDoc.billNumber;
    const oldBalanceDue = round2(targetDoc.balanceDue || 0);
    const partyId = targetDoc.partyId?._id || targetDoc.partyId;

    const {
      billNumber,
      date,
      items,
      subTotal,
      paymentReceived,
      notes,
    } = req.body;

    // Process line items if provided
    let processedItems = targetDoc.items || [];
    let calculatedSubtotal = 0;
    let totalBags = 0;
    let totalBillWeight = 0;

    if (Array.isArray(items) && items.length > 0) {
      processedItems = [];
      for (const it of items) {
        const desc = it.description || it.particulars || 'Goods Invoiced';
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
    }

    const finalSubTotal = calculatedSubtotal > 0
      ? calculatedSubtotal
      : subTotal !== undefined
      ? round2(Number(subTotal))
      : targetDoc.subTotal;

    const rawPay = paymentReceived !== undefined ? paymentReceived : targetDoc.paymentReceived;
    const finalPaymentReceived = round2(Math.max(0, Math.min(Number(rawPay) || 0, finalSubTotal)));
    const finalBalanceDue = round2(Math.max(0, finalSubTotal - finalPaymentReceived));

    let paymentStatus = 'UNPAID';
    if (finalBalanceDue <= 0) {
      paymentStatus = 'PAID';
    } else if (finalPaymentReceived > 0) {
      paymentStatus = 'PARTIAL';
    }

    const newBillNumber = billNumber && String(billNumber).trim()
      ? String(billNumber).trim().toUpperCase()
      : oldBillNumber;

    const billDate = date ? new Date(date) : new Date(targetDoc.date);

    // Delta in balance due to adjust party balance
    const deltaBalance = round2(finalBalanceDue - oldBalanceDue);

    // 1. Update Party balance
    let party = null;
    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      party = await Party.findOne({ _id: partyId, ...userFilter });
    }
    if (!party) {
      party = store.parties.find(
        (p) => (p._id || p.id)?.toString() === partyId?.toString()
      );
    }

    if (party && deltaBalance !== 0) {
      party.currentBalance = round2((party.currentBalance || 0) + deltaBalance);
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

    // 2. Update HistoricalBill document in MongoDB
    if (bill) {
      bill.billNumber = newBillNumber;
      bill.date = billDate;
      bill.items = processedItems;
      bill.subTotal = finalSubTotal;
      bill.paymentReceived = finalPaymentReceived;
      bill.balanceDue = finalBalanceDue;
      bill.paymentStatus = paymentStatus;
      if (notes !== undefined) bill.notes = notes;
      await bill.save();
    }

    // Update in-memory historical bill
    if (memBill) {
      memBill.billNumber = newBillNumber;
      memBill.date = billDate;
      memBill.items = processedItems;
      memBill.subTotal = finalSubTotal;
      memBill.paymentReceived = finalPaymentReceived;
      memBill.balanceDue = finalBalanceDue;
      memBill.paymentStatus = paymentStatus;
      if (notes !== undefined) memBill.notes = notes;
      memBill.updatedAt = new Date();
    }

    // 3. Synchronize Ledger Transactions
    // A) INVOICE Transaction (Debit)
    if (isDbConnected) {
      let invTx = await Transaction.findOne({
        referenceId: { $in: [oldBillNumber, newBillNumber] },
        type: 'INVOICE',
        ...userFilter,
      });

      if (invTx) {
        invTx.referenceId = newBillNumber;
        invTx.debit = finalSubTotal;
        invTx.date = billDate;
        if (notes !== undefined) invTx.notes = notes;
        await invTx.save();
      } else {
        await Transaction.create({
          user: targetDoc.user || req.userId,
          partyId: partyId,
          date: billDate,
          type: 'INVOICE',
          debit: finalSubTotal,
          credit: 0,
          paymentMode: 'CASH',
          referenceId: newBillNumber,
          notes: notes || `Historical bill #${newBillNumber}`,
        });
      }

      // B) PAYMENT_RECEIVED Transaction (Credit)
      let payTx = await Transaction.findOne({
        referenceId: { $in: [`RCP-${oldBillNumber}`, `RCP-${newBillNumber}`] },
        type: 'PAYMENT_RECEIVED',
        ...userFilter,
      });

      if (finalPaymentReceived > 0) {
        if (payTx) {
          payTx.referenceId = `RCP-${newBillNumber}`;
          payTx.credit = finalPaymentReceived;
          payTx.date = billDate;
          await payTx.save();
        } else {
          await Transaction.create({
            user: targetDoc.user || req.userId,
            partyId: partyId,
            date: billDate,
            type: 'PAYMENT_RECEIVED',
            debit: 0,
            credit: finalPaymentReceived,
            paymentMode: 'CASH',
            referenceId: `RCP-${newBillNumber}`,
            notes: `Advance / past payment recorded at time of bill #${newBillNumber}`,
          });
        }
      } else if (payTx) {
        // If paymentReceived was set to 0, remove the old payment transaction
        await Transaction.deleteOne({ _id: payTx._id });
      }
    }

    // Update in-memory transactions
    const memInvTx = (store.transactions || []).find(
      (t) => (t.referenceId === oldBillNumber || t.referenceId === newBillNumber) && t.type === 'INVOICE'
    );
    if (memInvTx) {
      memInvTx.referenceId = newBillNumber;
      memInvTx.debit = finalSubTotal;
      memInvTx.date = billDate;
      if (notes !== undefined) memInvTx.notes = notes;
    }

    const memPayTx = (store.transactions || []).find(
      (t) => (t.referenceId === `RCP-${oldBillNumber}` || t.referenceId === `RCP-${newBillNumber}`) && t.type === 'PAYMENT_RECEIVED'
    );
    if (finalPaymentReceived > 0) {
      if (memPayTx) {
        memPayTx.referenceId = `RCP-${newBillNumber}`;
        memPayTx.credit = finalPaymentReceived;
        memPayTx.date = billDate;
      } else {
        if (!Array.isArray(store.transactions)) store.transactions = [];
        store.transactions.unshift({
          _id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          user: targetDoc.user || req.userId,
          partyId: partyId,
          date: billDate,
          type: 'PAYMENT_RECEIVED',
          debit: 0,
          credit: finalPaymentReceived,
          paymentMode: 'CASH',
          referenceId: `RCP-${newBillNumber}`,
          notes: `Advance / past payment recorded at time of bill #${newBillNumber}`,
          createdAt: billDate,
        });
      }
    } else if (memPayTx) {
      store.transactions = store.transactions.filter((t) => t._id !== memPayTx._id);
    }

    return res.json({
      success: true,
      message: `Historical bill #${newBillNumber} updated and Bahi-Khata ledger synchronized successfully`,
      bill: bill || memBill,
      partyBalance: party ? round2(party.currentBalance) : undefined,
    });
  } catch (error) {
    console.error('Error in updateHistoricalBill:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete an existing historical bill, revert party balance, and remove ledger transactions
 * @route DELETE /api/historical-bills/:billId
 */
const deleteHistoricalBill = async (req, res) => {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  const userFilter = req.userFilter || {};
  const { billId } = req.params;

  try {
    let bill = null;
    if (isDbConnected) {
      if (mongoose.Types.ObjectId.isValid(billId)) {
        bill = await HistoricalBill.findOne({ _id: billId, ...userFilter });
      }
      if (!bill) {
        bill = await HistoricalBill.findOne({ billNumber: billId, ...userFilter });
      }
    }

    let memBill = (store.historicalBills || []).find(
      (b) => b._id === billId || b.billNumber === billId
    );

    if (!bill && !memBill && isDbConnected) {
      const order = await Order.findOne({
        $or: [
          { orderNumber: billId },
          ...(mongoose.Types.ObjectId.isValid(billId) ? [{ _id: billId }] : []),
        ],
        ...userFilter,
      });
      if (order) {
        const partyId = order.party;
        const totalAmount = round2(order.totalAmount || 0);
        let updatedBalance = undefined;
        if (partyId) {
          const party = await Party.findOne({ _id: partyId, ...userFilter });
          if (party) {
            party.currentBalance = round2((party.currentBalance || 0) - totalAmount);
            await party.save();
            updatedBalance = party.currentBalance;
          }
        }
        await Transaction.deleteMany({ referenceId: order.orderNumber, ...userFilter });
        await Order.deleteOne({ _id: order._id });
        return res.json({
          success: true,
          message: `Order invoice #${order.orderNumber} deleted and ledger restored successfully`,
          partyBalance: updatedBalance,
        });
      }
    }

    if (!bill && !memBill) {
      return res.status(404).json({ success: false, message: 'Historical bill not found' });
    }

    const targetDoc = bill || memBill;
    const targetBillNumber = targetDoc.billNumber;
    const balanceDue = round2(targetDoc.balanceDue || 0);
    const partyId = targetDoc.partyId?._id || targetDoc.partyId;

    // Revert party balance
    let party = null;
    if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
      party = await Party.findOne({ _id: partyId, ...userFilter });
    }
    if (!party) {
      party = store.parties.find(
        (p) => (p._id || p.id)?.toString() === partyId?.toString()
      );
    }

    if (party && balanceDue > 0) {
      party.currentBalance = round2((party.currentBalance || 0) - balanceDue);
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

    // Delete documents & transactions
    if (bill) {
      await HistoricalBill.deleteOne({ _id: bill._id });
    }
    if (isDbConnected) {
      await Transaction.deleteMany({
        referenceId: { $in: [targetBillNumber, `RCP-${targetBillNumber}`] },
        ...userFilter,
      });
    }

    store.historicalBills = (store.historicalBills || []).filter(
      (b) => b._id !== billId && b.billNumber !== billId && (memBill ? b._id !== memBill._id : true)
    );
    store.transactions = (store.transactions || []).filter(
      (t) => t.referenceId !== targetBillNumber && t.referenceId !== `RCP-${targetBillNumber}`
    );

    return res.json({
      success: true,
      message: `Historical bill #${targetBillNumber} deleted and ledger restored successfully`,
      partyBalance: party ? round2(party.currentBalance) : undefined,
    });
  } catch (error) {
    console.error('Error in deleteHistoricalBill:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createHistoricalBills,
  getPartyHistoricalBills,
  getHistoricalBillPrintData,
  getHistoricalBillById,
  updateHistoricalBill,
  deleteHistoricalBill,
};
