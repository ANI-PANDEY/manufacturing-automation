const mongoose = require('mongoose');
const RawMaterial = require('../models/RawMaterial');
const Product = require('../models/Product');
const Party = require('../models/Party');
const store = require('../utils/inMemoryStore');
const { round2 } = require('../utils/mathUtils');

/**
 * @desc Inward raw material from vendor
 * @route POST /api/inventory/raw-materials/inward
 */
const inwardRawMaterial = async (req, res) => {
  try {
    const {
      materialName,
      category,
      vendorId,
      batchNumber,
      unit,
      quantityInStock,
      unitPrice,
      receivedDate,
      expiryDate,
      notes,
    } = req.body;

    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};
    const userId = mongoose.Types.ObjectId.isValid(req.userId)
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    if (!materialName || !vendorId || !batchNumber || !quantityInStock || !unitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Material name, Vendor, Batch number, Quantity, and Unit Price are required',
      });
    }

    let vendor = null;
    const isValidVendorObjectId = isDbConnected && mongoose.Types.ObjectId.isValid(vendorId);

    if (isValidVendorObjectId) {
      vendor = await Party.findOne({ _id: vendorId, ...userFilter });
    }
    if (!vendor) {
      vendor = store.parties.find(
        (p) => (p._id === vendorId || p._id?.toString() === vendorId) && (req.isDemoAdmin || p.user === req.userId)
      );
    }

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor party not found' });
    }

    const rawMaterialPayload = {
      user: userId,
      materialName: materialName.trim(),
      category: category ? category.trim() : 'Steel & Metals',
      vendor: vendor._id || vendorId,
      batchNumber: batchNumber.trim(),
      unit: unit || 'Kg',
      quantityInStock: round2(quantityInStock),
      unitPrice: round2(unitPrice),
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      notes: notes ? notes.trim() : '',
    };

    let rawMaterialData = null;

    if (isDbConnected) {
      const rawMaterial = new RawMaterial(rawMaterialPayload);
      await rawMaterial.save();
      rawMaterialData = await RawMaterial.findById(rawMaterial._id).populate('vendor', 'name phone email gstin');
    } else {
      rawMaterialData = {
        _id: `rm_${Date.now()}`,
        ...rawMaterialPayload,
        vendor: {
          _id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          gstin: vendor.gstin,
        },
        createdAt: new Date(),
      };
    }

    store.rawMaterials.unshift(rawMaterialData);

    return res.status(201).json({
      success: true,
      message: 'Raw material inward recorded successfully',
      rawMaterial: rawMaterialData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc List all raw materials for the authenticated user
 * @route GET /api/inventory/raw-materials
 */
const getRawMaterials = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let rawMaterials = [];
    if (isDbConnected) {
      rawMaterials = await RawMaterial.find(userFilter)
        .populate('vendor', 'name phone email gstin')
        .sort({ createdAt: -1 });
      return res.json({ success: true, count: rawMaterials.length, rawMaterials });
    }

    // In-memory fallback: only show demo items if demo admin, otherwise empty
    rawMaterials = store.rawMaterials
      .filter((rm) => req.isDemoAdmin || rm.user === req.userId)
      .map((rm) => {
        const vendorObj = store.parties.find((p) => p._id === (rm.vendor?._id || rm.vendor));
        return {
          ...rm,
          vendor: vendorObj || rm.vendor,
        };
      });

    return res.json({ success: true, count: rawMaterials.length, rawMaterials });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Get all finished products for the authenticated user
 * @route GET /api/inventory/products
 */
const getProducts = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    let products = [];
    if (isDbConnected) {
      products = await Product.find(userFilter).sort({ productName: 1 });
    } else {
      products = store.products.filter((p) => req.isDemoAdmin || p.user === req.userId);
    }

    return res.json({ success: true, count: products.length, products });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Create new product catalog item or add stock for the user
 * @route POST /api/inventory/products
 */
const createProduct = async (req, res) => {
  try {
    const { productName, sku, category, unit, stockQuantity, unitPrice, minStockLevel } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};
    const userId = mongoose.Types.ObjectId.isValid(req.userId)
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    if (!productName || !sku || !unitPrice) {
      return res.status(400).json({ success: false, message: 'Product name, SKU code, and Unit Price are required' });
    }

    const skuUpper = sku.trim().toUpperCase();

    if (isDbConnected) {
      let product = await Product.findOne({ sku: skuUpper, ...userFilter });
      if (product) {
        product.stockQuantity += Number(stockQuantity || 0);
        product.unitPrice = round2(unitPrice);
        await product.save();
        return res.json({ success: true, message: 'Product stock updated', product });
      }

      product = new Product({
        user: userId,
        productName: productName.trim(),
        sku: skuUpper,
        category: category ? category.trim() : 'Finished Goods',
        unit: unit || 'Pieces',
        stockQuantity: Number(stockQuantity || 0),
        unitPrice: round2(unitPrice),
        minStockLevel: Number(minStockLevel || 10),
      });

      await product.save();
      return res.status(201).json({ success: true, message: 'Product created successfully', product });
    } else {
      let product = store.products.find(
        (p) => p.sku === skuUpper && (req.isDemoAdmin || p.user === req.userId)
      );
      if (product) {
        product.stockQuantity += Number(stockQuantity || 0);
        product.unitPrice = round2(unitPrice);
        return res.json({ success: true, message: 'Product stock updated', product });
      }

      product = {
        _id: `prod_${Date.now()}`,
        user: req.userId,
        productName: productName.trim(),
        sku: skuUpper,
        category: category ? category.trim() : 'Finished Goods',
        unit: unit || 'Pieces',
        stockQuantity: Number(stockQuantity || 0),
        unitPrice: round2(unitPrice),
        minStockLevel: Number(minStockLevel || 10),
        createdAt: new Date(),
      };

      store.products.push(product);
      return res.status(201).json({ success: true, message: 'Product created successfully', product });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Restock existing product (add quantity)
 * @route POST /api/inventory/products/restock
 */
const restockProduct = async (req, res) => {
  try {
    const { productId, quantityToAdd, unitPrice } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    if (!productId || quantityToAdd === undefined || quantityToAdd === null) {
      return res.status(400).json({ success: false, message: 'Product ID and quantity to add are required' });
    }

    const qtyNum = Number(quantityToAdd);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity to add must be greater than 0' });
    }

    let updatedProduct = null;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(productId)) {
      const product = await Product.findOne({ _id: productId, ...userFilter });
      if (product) {
        product.stockQuantity += round2(qtyNum);
        if (unitPrice && Number(unitPrice) > 0) {
          product.unitPrice = round2(unitPrice);
        }
        await product.save();
        updatedProduct = product.toObject();
      }
    }

    if (!updatedProduct) {
      const prod = store.products.find(
        (p) => (p._id === productId || p._id?.toString() === productId) && (req.isDemoAdmin || p.user === req.userId)
      );
      if (prod) {
        prod.stockQuantity = round2(prod.stockQuantity + qtyNum);
        if (unitPrice && Number(unitPrice) > 0) {
          prod.unitPrice = round2(unitPrice);
        }
        updatedProduct = prod;
      }
    }

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({
      success: true,
      message: `Successfully restocked +${qtyNum} ${updatedProduct.unit || 'units'} of ${updatedProduct.productName}`,
      product: updatedProduct,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Restock existing raw material batch (add quantity)
 * @route POST /api/inventory/raw-materials/restock
 */
const restockRawMaterial = async (req, res) => {
  try {
    const { rawMaterialId, quantityToAdd, unitPrice } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    if (!rawMaterialId || quantityToAdd === undefined || quantityToAdd === null) {
      return res.status(400).json({ success: false, message: 'Raw material ID and quantity to add are required' });
    }

    const qtyNum = Number(quantityToAdd);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity to add must be greater than 0' });
    }

    let updatedRawMaterial = null;

    if (isDbConnected && mongoose.Types.ObjectId.isValid(rawMaterialId)) {
      const rm = await RawMaterial.findOne({ _id: rawMaterialId, ...userFilter });
      if (rm) {
        rm.quantityInStock += round2(qtyNum);
        if (unitPrice && Number(unitPrice) > 0) {
          rm.unitPrice = round2(unitPrice);
        }
        await rm.save();
        updatedRawMaterial = await RawMaterial.findById(rm._id).populate('vendor', 'name phone email gstin');
      }
    }

    if (!updatedRawMaterial) {
      const rm = store.rawMaterials.find(
        (m) => (m._id === rawMaterialId || m._id?.toString() === rawMaterialId) && (req.isDemoAdmin || m.user === req.userId)
      );
      if (rm) {
        rm.quantityInStock = round2(rm.quantityInStock + qtyNum);
        if (unitPrice && Number(unitPrice) > 0) {
          rm.unitPrice = round2(unitPrice);
        }
        updatedRawMaterial = rm;
      }
    }

    if (!updatedRawMaterial) {
      return res.status(404).json({ success: false, message: 'Raw material batch not found' });
    }

    return res.json({
      success: true,
      message: `Successfully added +${qtyNum} ${updatedRawMaterial.unit || 'Kg'} to ${updatedRawMaterial.materialName}`,
      rawMaterial: updatedRawMaterial,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete a product from catalog
 * @route DELETE /api/inventory/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      await Product.findOneAndDelete({ _id: id, ...userFilter });
    }
    store.products = store.products.filter((p) => p._id !== id && p._id?.toString() !== id);

    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete a raw material batch
 * @route DELETE /api/inventory/raw-materials/:id
 */
const deleteRawMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};

    if (isDbConnected && mongoose.Types.ObjectId.isValid(id)) {
      await RawMaterial.findOneAndDelete({ _id: id, ...userFilter });
    }
    store.rawMaterials = store.rawMaterials.filter((m) => m._id !== id && m._id?.toString() !== id);

    return res.json({ success: true, message: 'Raw material batch deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Bulk upload products for the user
 * @route POST /api/inventory/products/bulk-upload
 */
const bulkUploadProducts = async (req, res) => {
  try {
    const { products, updateStock = true } = req.body;
    const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
    const userFilter = req.userFilter || {};
    const userId = mongoose.Types.ObjectId.isValid(req.userId)
      ? new mongoose.Types.ObjectId(req.userId)
      : req.userId;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No product records found to upload. Please supply an array of products.',
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors = [];
    const processedItems = [];

    for (let i = 0; i < products.length; i++) {
      const item = products[i];
      const rawName = item.productName || item.name || item.title;
      const rawPrice = item.unitPrice !== undefined ? item.unitPrice : (item.price || item.rate);

      if (!rawName || rawPrice === undefined || isNaN(Number(rawPrice))) {
        failedCount++;
        errors.push({
          row: i + 1,
          item,
          reason: 'Missing product name or valid unit price / rate',
        });
        continue;
      }

      const productName = String(rawName).trim();
      const sku = item.sku && String(item.sku).trim()
        ? String(item.sku).trim().toUpperCase()
        : `SKU-${productName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PROD'}-${Math.floor(1000 + Math.random() * 9000)}`;
      const unitPrice = round2(Number(rawPrice));
      const category = item.category ? String(item.category).trim() : 'Finished Goods';
      const unit = item.unit ? String(item.unit).trim() : 'Pieces';
      const stockQuantity = item.stockQuantity !== undefined && !isNaN(Number(item.stockQuantity))
        ? round2(Number(item.stockQuantity))
        : 0;
      const minStockLevel = item.minStockLevel !== undefined && !isNaN(Number(item.minStockLevel))
        ? Number(item.minStockLevel)
        : 10;

      if (isDbConnected) {
        let existing = await Product.findOne({
          ...userFilter,
          $or: [
            { sku: sku },
            { productName: { $regex: new RegExp(`^${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
          ],
        });

        if (existing) {
          existing.unitPrice = unitPrice;
          if (category && category !== 'Finished Goods') existing.category = category;
          if (unit && unit !== 'Pieces') existing.unit = unit;
          if (updateStock && stockQuantity > 0) {
            existing.stockQuantity += stockQuantity;
          }
          await existing.save();
          updatedCount++;
          processedItems.push({ action: 'UPDATED', product: existing });
        } else {
          const newProd = new Product({
            user: userId,
            productName,
            sku,
            category,
            unit,
            unitPrice,
            stockQuantity,
            minStockLevel,
          });
          await newProd.save();
          createdCount++;
          processedItems.push({ action: 'CREATED', product: newProd });
        }
      } else {
        let existing = store.products.find(
          (p) => (p.sku === sku || p.productName.toLowerCase() === productName.toLowerCase()) && (req.isDemoAdmin || p.user === req.userId)
        );

        if (existing) {
          existing.unitPrice = unitPrice;
          if (category && category !== 'Finished Goods') existing.category = category;
          if (unit && unit !== 'Pieces') existing.unit = unit;
          if (updateStock && stockQuantity > 0) {
            existing.stockQuantity += stockQuantity;
          }
          updatedCount++;
          processedItems.push({ action: 'UPDATED', product: existing });
        } else {
          const newProd = {
            _id: `prod_${Date.now()}_${i}`,
            user: req.userId,
            productName,
            sku,
            category,
            unit,
            unitPrice,
            stockQuantity,
            minStockLevel,
            createdAt: new Date(),
          };
          store.products.push(newProd);
          createdCount++;
          processedItems.push({ action: 'CREATED', product: newProd });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk processing complete: ${createdCount} created, ${updatedCount} updated, ${failedCount} errors.`,
      stats: {
        totalReceived: products.length,
        created: createdCount,
        updated: updatedCount,
        failed: failedCount,
      },
      errors,
      items: processedItems,
    });
  } catch (error) {
    console.error('Error in bulkUploadProducts:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  inwardRawMaterial,
  getRawMaterials,
  getProducts,
  createProduct,
  restockProduct,
  restockRawMaterial,
  deleteProduct,
  deleteRawMaterial,
  bulkUploadProducts,
};
