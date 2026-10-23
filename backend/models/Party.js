const mongoose = require('mongoose');

const partySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Party name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['CUSTOMER', 'VENDOR', 'BOTH'],
      default: 'CUSTOMER',
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    creditLimit: {
      type: Number,
      default: 500000,
    },
    // Current outstanding balance (Positive = Party owes money / Debit balance)
    currentBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

partySchema.index({ name: 1 });
partySchema.index({ gstin: 1 });
partySchema.index({ type: 1 });

module.exports = mongoose.model('Party', partySchema);
