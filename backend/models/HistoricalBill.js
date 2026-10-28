const mongoose = require('mongoose');

const historicalBillItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Item description is required'],
    trim: true,
  },
  bags: {
    type: Number,
    default: 0,
    min: 0,
  },
  qtyPerBag: {
    type: Number, // weight in kg per bag
    default: 0,
    min: 0,
  },
  totalWeight: {
    type: Number, // auto-computed as bags * qtyPerBag or loose weight
    required: [true, 'Total weight in kg is required'],
    min: 0,
  },
  rate: {
    type: Number, // rate per kg
    required: [true, 'Rate per kg is required'],
    min: 0,
  },
  amount: {
    type: Number, // totalWeight * rate
    required: [true, 'Amount is required'],
    min: 0,
  },
});

const historicalBillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    billNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    partyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: [true, 'Party / Customer reference is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Bill date is required'],
      default: Date.now,
      index: true,
    },
    items: {
      type: [historicalBillItemSchema],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'At least one line item is required in the historical bill',
      },
    },
    subTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    balanceDue: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PARTIAL', 'UNPAID'],
      default: 'UNPAID',
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

historicalBillSchema.index({ user: 1, partyId: 1, date: -1 });
historicalBillSchema.index({ user: 1, billNumber: 1 });

module.exports = mongoose.model('HistoricalBill', historicalBillSchema);
