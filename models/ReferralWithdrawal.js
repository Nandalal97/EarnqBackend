const mongoose = require("mongoose");

// models/ReferralWithdrawal.js
const referralWithdrawalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  status: {
    type: String,
     enum: ["pending", "approved", "completed", "rejected"],
    default: "pending"
  },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  completedAt: { type: Date },
  adminNote: { type: String },
   rejectedAt: { type: Date }, 

  // New payment details
  paymentMethod: { type: String, enum: ["upi", "bank"], required: true },
  upiId: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model("ReferralWithdrawal", referralWithdrawalSchema);
