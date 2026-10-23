const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU code is required'],
      unique: true,
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

productSchema.index({ productName: 1 });

module.exports = mongoose.model('Product', productSchema);
