const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: [true, 'Party ID is required'],
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    type: {
      type: String,
      enum: ['OPENING_BALANCE', 'INVOICE', 'PAYMENT_RECEIVED', 'PAYMENT_MADE'],
      required: true,
    },
    // Mal becha ya balance lena nikla (+) -> Debit
    debit: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Client ne jama kiya (-) -> Credit
    credit: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'],
      default: 'CASH',
    },
    referenceId: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ user: 1, partyId: 1, date: -1 });
transactionSchema.index({ partyId: 1, date: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
