const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Party = require('../models/Party');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');

/**
 * @desc Create new dispatch invoice & deduct stock with 100% precision
 * @route POST /api/orders
 */
const createOrder = async (req, res) => {
  try {
    const { partyId, orderDate, items, taxRate = 18, dispatchNotes } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    if (!partyId || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Party ID and at least one order item are required' });
    }

    let party = null;
    const isValidPartyObjectId = isDbConnected && mongoose.Types.ObjectId.isValid(partyId);

    if (isValidPartyObjectId) {
      party = await Party.findById(partyId);
    }
    if (!party) {
      party = store.parties.find((p) => p._id === partyId || p._id?.toString() === partyId);
    }

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    let subtotalAmount = 0;
    const processedItems = [];

    for (const item of items) {
      let product = null;
      if (isDbConnected && mongoose.Types.ObjectId.isValid(item.productId)) {
        product = await Product.findById(item.productId);
      }
      if (!product) {
        product = store.products.find((p) => p._id === item.productId || p._id?.toString() === item.productId);
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
 * @desc Get list of orders with filters
 * @route GET /api/orders
 */
const getOrders = async (req, res) => {
  try {
    const { partyId, paymentStatus } = req.query;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;

    let orders = [];
    if (isDbConnected && (!partyId || mongoose.Types.ObjectId.isValid(partyId))) {
      const filter = {};
      if (partyId) filter.party = partyId;
      if (paymentStatus) filter.paymentStatus = paymentStatus;

      orders = await Order.find(filter)
        .populate('party', 'name phone gstin email')
        .sort({ orderDate: -1 });
    }

    if (!orders || orders.length === 0) {
      orders = store.orders.filter((o) => {
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
    }

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
    let order = null;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(req.params.id)) {
      order = await Order.findById(req.params.id)
        .populate('party')
        .populate('items.product');
    }

    if (!order) {
      order = store.orders.find((o) => o._id === req.params.id);
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

    let targetOrder = null;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      targetOrder = await Order.findById(id).populate('party');
    }

    if (!targetOrder) {
      targetOrder = store.orders.find((o) => o._id === id || o._id?.toString() === id);
    }

    if (!targetOrder) {
      return res.status(404).json({ success: false, message: 'Order / Invoice not found' });
    }

    // 1. Restore stock quantity for all items in order
    if (targetOrder.items && targetOrder.items.length) {
      for (const item of targetOrder.items) {
        const prodId = item.product?._id || item.product;
        const qtyToRestore = Number(item.quantity) || 0;

        if (isDbConnected && mongoose.Types.ObjectId.isValid(prodId)) {
          const prod = await Product.findById(prodId);
          if (prod) {
            prod.stockQuantity = round2(prod.stockQuantity + qtyToRestore);
            await prod.save();
          }
        }
        const memProd = store.products.find((p) => p._id === prodId || p._id?.toString() === prodId);
        if (memProd) {
          memProd.stockQuantity = round2(memProd.stockQuantity + qtyToRestore);
        }
      }
    }

    // 2. Adjust Party Current Balance (Subtract totalAmount or balanceDue from party.currentBalance)
    const partyIdStr = (targetOrder.party?._id || targetOrder.party)?.toString();
    const amountToDeduct = round2(targetOrder.totalAmount - (targetOrder.paidAmount || 0));

    if (partyIdStr && amountToDeduct > 0) {
      if (isDbConnected && mongoose.Types.ObjectId.isValid(partyIdStr)) {
        const partyObj = await Party.findById(partyIdStr);
        if (partyObj) {
          partyObj.currentBalance = Math.max(0, round2(partyObj.currentBalance - amountToDeduct));
          await partyObj.save();
        }
      }
      const memParty = store.parties.find((p) => p._id?.toString() === partyIdStr || p.id?.toString() === partyIdStr);
      if (memParty) {
        memParty.currentBalance = Math.max(0, round2(memParty.currentBalance - amountToDeduct));
      }
    }

    // 3. Delete from DB & Store
    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      await Order.findByIdAndDelete(id);
    }

    store.orders = store.orders.filter((o) => o._id?.toString() !== id?.toString());

    return res.json({
      success: true,
      message: `Invoice ${targetOrder.orderNumber} deleted successfully. Stock and party balance restored.`,
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
