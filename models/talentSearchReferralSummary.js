// models/ReferralSummary.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const talentSearchReferralSummary = new Schema({
  referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  affiliateUserId: { type: Schema.Types.ObjectId, ref: 'AffiliateUser', default: null },
  contestId: { type: Schema.Types.ObjectId, ref: 'Contest', required: true },
  totalReferred: { type: Number, default: 0 },
  totalCommission: { type: Number, default: 0 },
   referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

// একই referrer + contest combination যেন একবারই থাকে
talentSearchReferralSummary.index({ referrerId: 1, contestId: 1 }, { unique: true });

module.exports = mongoose.model('TalentSearchReferralSummary', talentSearchReferralSummary);
