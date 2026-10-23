const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU code is required'],
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Finished Goods',
    },
    unit: {
      type: String,
      default: 'Pieces',
      trim: true,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 10,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ user: 1, productName: 1 });
productSchema.index({ user: 1, sku: 1 });

module.exports = mongoose.model('Product', productSchema);
