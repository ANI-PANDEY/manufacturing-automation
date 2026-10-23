const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema(
  {
    materialName: {
      type: String,
      required: [true, 'Raw material name is required'],
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Steel & Metals',
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      trim: true,
    },
    unit: {
      type: String,
      required: true,
      default: 'Kg',
      trim: true,
    },
    quantityInStock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    receivedDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

rawMaterialSchema.index({ batchNumber: 1 });
rawMaterialSchema.index({ vendor: 1 });
rawMaterialSchema.index({ materialName: 1 });

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);
