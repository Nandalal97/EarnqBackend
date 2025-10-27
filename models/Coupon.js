const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true },
  minPurchase: { type: Number, default: 0 },
  maxUses: { type: Number, default: 1 },
  usedCount: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true },
  marketerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
