const mongoose = require('mongoose');

const partySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
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
      default: 0,
    },
    // Current outstanding balance (Positive = Party owes money / Debit balance)
    currentBalance: {
      type: Number,
      default: 0,
    },
    // Historical / Manual Opening Balance when migrating from old register/Excel
    openingBalance: {
      type: Number,
      default: 0,
    },
    openingBalanceType: {
      type: String,
      enum: ['TO_RECEIVE', 'TO_PAY', 'RECEIVABLE', 'PAYABLE'],
      default: 'TO_RECEIVE',
    },
    openingBalanceDate: {
      type: Date,
      default: Date.now,
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
