const mongoose = require('mongoose');
const Party = require('../models/Party');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');
const Order = require('../models/Order');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');
const { bulkImportParties } = require('./partyController');
const { bulkUploadProducts, bulkImportRawMaterials } = require('./inventoryController');
const { bulkImportOrders } = require('./orderController');

/**
 * @desc Get Data Migration & System Overview Stats
 * @route GET /api/migration/status
 */
const getMigrationStats = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let partiesCount = 0;
    let productsCount = 0;
    let rawMaterialsCount = 0;
    let ordersCount = 0;
    let totalOpeningBalance = 0;
    let totalReceivable = 0;
    let totalPayable = 0;

    if (isDbConnected) {
      partiesCount = await Party.countDocuments(userFilter);
      productsCount = await Product.countDocuments(userFilter);
      rawMaterialsCount = await RawMaterial.countDocuments(userFilter);
      ordersCount = await Order.countDocuments(userFilter);

      const parties = await Party.find(userFilter, 'openingBalance openingBalanceType currentBalance');
      parties.forEach((p) => {
        const ob = round2(p.openingBalance || 0);
        if (p.openingBalanceType === 'PAYABLE') {
          totalPayable = round2(totalPayable + ob);
        } else {
          totalReceivable = round2(totalReceivable + ob);
        }
        totalOpeningBalance = round2(totalOpeningBalance + (p.currentBalance || 0));
      });
    } else {
      const userParties = store.parties.filter((p) => req.isDemoAdmin || p.user === req.userId);
      const userProducts = store.products.filter((p) => req.isDemoAdmin || p.user === req.userId);
      const userRm = store.rawMaterials.filter((rm) => req.isDemoAdmin || rm.user === req.userId);
      const userOrders = store.orders.filter((o) => req.isDemoAdmin || o.user === req.userId);

      partiesCount = userParties.length;
      productsCount = userProducts.length;
      rawMaterialsCount = userRm.length;
      ordersCount = userOrders.length;

      userParties.forEach((p) => {
        const ob = round2(p.openingBalance || 0);
        if (p.openingBalanceType === 'PAYABLE') {
          totalPayable = round2(totalPayable + ob);
        } else {
          totalReceivable = round2(totalReceivable + ob);
        }
        totalOpeningBalance = round2(totalOpeningBalance + (p.currentBalance || 0));
      });
    }

    return res.json({
      success: true,
      stats: {
        partiesCount,
        productsCount,
        rawMaterialsCount,
        ordersCount,
        totalOpeningBalance,
        totalReceivable,
        totalPayable,
      },
    });
  } catch (error) {
    console.error('Error in getMigrationStats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMigrationStats,
  bulkImportParties,
  bulkUploadProducts,
  bulkImportRawMaterials,
  bulkImportOrders,
};
