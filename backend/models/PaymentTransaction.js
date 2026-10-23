const mongoose = require('mongoose');

const allocationSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  orderNumber: {
    type: String,
    required: true,
  },
  amountAllocated: {
    type: Number,
    required: true,
    min: 0,
  },
});

const paymentTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: true,
    },
    // Value Date (Date customer paid / bank credit date)
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // System Entry Date (System timestamp)
    entryDate: {
      type: Date,
      default: Date.now,
    },
    amountPaid: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than 0'],
    },
    paymentMode: {
      type: String,
      enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI'],
      default: 'BANK_TRANSFER',
    },
    referenceNo: {
      type: String,
      trim: true,
      default: '',
    },
    allocationType: {
      type: String,
      enum: ['SPECIFIC_ORDER', 'FIFO'],
      default: 'FIFO',
    },
    allocations: [allocationSchema],
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

paymentTransactionSchema.index({ user: 1, receiptNumber: 1 });
paymentTransactionSchema.index({ user: 1, party: 1 });
paymentTransactionSchema.index({ user: 1, paymentDate: -1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
