const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReferralSchema = new Schema({
  referrerUserId: { type: Schema.Types.ObjectId, ref: 'AffiliateUser', required: true },
  referredRegistrationId: { type: Schema.Types.ObjectId, ref: 'TalentBooking', required: true },
  paymentId: { type: Schema.Types.ObjectId, ref: 'TalentPayment', required: true },
  commissionAmount: { type: Number, default: 10 }, // per student
  payoutStatus: { type: String, enum: ['pending','paid'], default: 'pending' }
}, { timestamps: true });

// Prevent duplicate commission for same student
ReferralSchema.index({ referrerUserId:1, referredRegistrationId:1 }, { unique: true });

module.exports = mongoose.model('AffiliateCommission', ReferralSchema);
