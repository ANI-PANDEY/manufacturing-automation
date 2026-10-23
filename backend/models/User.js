const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    salt: {
      type: String,
      required: [true, 'Salt is required'],
    },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'OPERATOR'],
      default: 'ADMIN',
    },
    companyName: {
      type: String,
      default: 'Manufacturing ERP Enterprise',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
