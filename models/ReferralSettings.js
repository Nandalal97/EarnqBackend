// models/ReferralSettings.js
const mongoose = require("mongoose");

const referralSettingsSchema = new mongoose.Schema({
  signupBonus: { type: Number, default: 0 },              // new user join bonus
  referrerSignupBonus: { type: Number, default: 0 },       // referrer bonus when user joins
  referrerSubscriptionBonus: { type: Number, default: 0 }, // fixed bonus on subscription
  subscriptionCommissionPercent: { type: Number, default: 0 },// % commission
  talentSearchCommission: { type: Number, default: 0 } // talent search commission
}, { timestamps: true });

module.exports = mongoose.model("ReferralSettings", referralSettingsSchema);
