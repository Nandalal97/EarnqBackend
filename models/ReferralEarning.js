const mongoose = require("mongoose");
const referralEarningSchema = new mongoose.Schema({
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    type: { type: String, enum: ["signupBonus", "instantBonus", "subscriptionCommission"], required: true },
    status: { type: String, enum: ["credited", "pending", "cancelled"], default: "pending" },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ReferralEarning", referralEarningSchema);