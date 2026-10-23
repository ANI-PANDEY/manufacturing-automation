const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Party = require('../models/Party');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');

/**
 * @desc Create new dispatch invoice & deduct stock for authenticated user
 * @route POST /api/orders
 */
const createOrder = async (req, res) => {
  try {
    const { partyId, orderDate, items, taxRate = 18, dispatchNotes } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};
    const userId = mongoose.Types.ObjectId.isValid(req.userId)
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    if (!partyId || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Party ID and at least one order item are required' });
    }

    let party = null;
    const isValidPartyObjectId = isDbConnected && mongoose.Types.ObjectId.isValid(partyId);

    if (isValidPartyObjectId) {
      party = await Party.findOne({ _id: partyId, ...userFilter });
    }
    if (!party) {
      party = store.parties.find(
        (p) => (p._id === partyId || p._id?.toString() === partyId) && (req.isDemoAdmin || p.user === req.userId)
      );
    }

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    let subtotalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      let product = null;
      if (isDbConnected && mongoose.Types.ObjectId.isValid(item.productId)) {
        product = await Product.findOne({ _id: item.productId, ...userFilter });
      }
      if (!product) {
        product = store.products.find(
          (p) => (p._id === item.productId || p._id?.toString() === item.productId) && (req.isDemoAdmin || p.user === req.userId)
        );
      }

      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }

      const reqQty = Number(item.quantity) || 0;
      if (product.stockQuantity < reqQty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product '${product.productName}'. Available: ${product.stockQuantity}, Requested: ${reqQty}`,
        });
      }

      // Deduct stock
      product.stockQuantity -= reqQty;
      if (isDbConnected && typeof product.save === 'function') {
        await product.save();
      }

      const itemRate = round2(item.unitPrice || product.unitPrice);
      const itemSubtotal = round2(reqQty * itemRate);
      subtotalAmount = round2(subtotalAmount + itemSubtotal);

      processedItems.push({
        product: product._id,
        productName: product.productName,
        quantity: reqQty,
        unitPrice: itemRate,
        unit: product.unit || 'Pieces',
        subtotal: itemSubtotal,
      });
    }

    const taxAmount = round2((subtotalAmount * Number(taxRate)) / 100);
    const totalAmount = round2(subtotalAmount + taxAmount);

    const orderNumber = `INV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const orderPayload = {
      user: userId,
      orderNumber,
      party: party._id || partyId,
      orderDate: orderDate ? new Date(orderDate) : new Date(),
      items: processedItems,
      subtotalAmount,
      taxRate: Number(taxRate),
      taxAmount,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      paymentStatus: 'UNPAID',
      dispatchNotes: dispatchNotes || '',
    };

    let newOrderData = null;

    if (isValidPartyObjectId) {
      try {
        const newOrder = new Order(orderPayload);
        await newOrder.save();
        newOrderData = newOrder.toObject();
      } catch (orderErr) {
        console.warn('[Order DB Save Fallback]:', orderErr.message);
      }
    }

    if (!newOrderData) {
      newOrderData = {
        _id: `ord_${Date.now()}`,
        ...orderPayload,
        createdAt: new Date(),
      };
    }

    store.orders.unshift(newOrderData);

    // Update Party Current Outstanding Balance
    party.currentBalance = round2((party.currentBalance || 0) + totalAmount);
    if (isDbConnected && typeof party.save === 'function') {
      await party.save();
    }

    // Keep store.parties synchronized
    const memParty = store.parties.find((p) => p._id === partyId || p._id?.toString() === partyId);
    if (memParty) {
      memParty.currentBalance = round2(party.currentBalance);
    }

    return res.status(201).json({
      success: true,
      message: 'Dispatch Order & Invoice generated successfully',
      order: newOrderData,
    });
  } catch (error) {
    console.error('Error in createOrder:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get list of orders for authenticated user
 * @route GET /api/orders
 */
const getOrders = async (req, res) => {
  try {
    const { partyId, paymentStatus } = req.query;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let orders = [];
    if (isDbConnected && (!partyId || mongoose.Types.ObjectId.isValid(partyId))) {
      const filter = { ...userFilter };
      if (partyId) filter.party = partyId;
      if (paymentStatus) filter.paymentStatus = paymentStatus;

      orders = await Order.find(filter)
        .populate('party', 'name phone gstin email')
        .sort({ orderDate: -1 });

      return res.json({ success: true, count: orders.length, orders });
    }

    // In-memory fallback
    orders = store.orders.filter((o) => {
      if (!req.isDemoAdmin && o.user !== req.userId) return false;
      let match = true;
      if (partyId && (o.party?._id || o.party)?.toString() !== partyId) match = false;
      if (paymentStatus && o.paymentStatus !== paymentStatus) match = false;
      return match;
    });

    // Populate party in memory
    orders = orders.map((o) => {
      const partyObj = store.parties.find((p) => p._id === (o.party?._id || o.party));
      return {
        ...o,
        party: partyObj || o.party,
      };
    });

    return res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get single order by ID
 * @route GET /api/orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};
    let order = null;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await Order.findOne({ _id: req.params.id, ...userFilter })
        .populate('party')
        .populate('items.product');
    }

    if (!order) {
      order = store.orders.find(
        (o) => o._id === req.params.id && (req.isDemoAdmin || o.user === req.userId)
      );
      if (order) {
        const partyObj = store.parties.find((p) => p._id === (order.party?._id || order.party));
        order = { ...order, party: partyObj };
      }
    }

    return res.json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Cancel & Delete dispatch order/invoice, restoring stock and party balance
 * @route DELETE /api/orders/:id
 */
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let targetOrder = null;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      targetOrder = await Order.findOne({ _id: id, ...userFilter }).populate('party');
    }

    if (!targetOrder) {
      targetOrder = store.orders.find((o) => o._id === id && (req.isDemoAdmin || o.user === req.userId));
    }

    if (!targetOrder) {
      return res.status(404).json({ success: false, message: 'Order invoice not found' });
    }

    // Restore stock for all items
    if (targetOrder.items && targetOrder.items.length) {
      for (const item of targetOrder.items) {
        const prodId = item.product?._id || item.product;
        if (isDbConnected && mongoose.Types.ObjectId.isValid(prodId)) {
          const product = await Product.findOne({ _id: prodId, ...userFilter });
          if (product) {
            product.stockQuantity += Number(item.quantity) || 0;
            await product.save();
          }
        }
        const memProd = store.products.find((p) => (p._id === prodId || p._id?.toString() === prodId?.toString()));
        if (memProd) {
          memProd.stockQuantity += Number(item.quantity) || 0;
        }
      }
    }

    // Revert Party Balance
    const partyId = targetOrder.party?._id || targetOrder.party;
    if (partyId) {
      if (isDbConnected && mongoose.Types.ObjectId.isValid(partyId)) {
        const party = await Party.findOne({ _id: partyId, ...userFilter });
        if (party) {
          party.currentBalance = round2((party.currentBalance || 0) - (targetOrder.totalAmount || 0));
          await party.save();
        }
      }
      const memParty = store.parties.find((p) => p._id === partyId || p._id?.toString() === partyId?.toString());
      if (memParty) {
        memParty.currentBalance = round2((memParty.currentBalance || 0) - (targetOrder.totalAmount || 0));
      }
    }

    // Delete order
    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      await Order.findOneAndDelete({ _id: id, ...userFilter });
    }
    store.orders = store.orders.filter((o) => o._id !== id);

    return res.json({
      success: true,
      message: `Invoice #${targetOrder.orderNumber} successfully canceled and deleted. Stock and party balance restored.`,
    });
  } catch (error) {
    console.error('Error in deleteOrder:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  deleteOrder,
};
