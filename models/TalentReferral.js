const TalentReferralSchema = new Schema({
  referrerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  referredUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  registrationId: { type: Schema.Types.ObjectId, ref: 'TalentBooking', required: true },
  commissionAmount: { type: Number, default: 10 },
  payoutStatus: { type: String, enum:['pending','paid'], default:'pending' }
}, { timestamps: true });

// Prevent multiple commissions for same referral
TalentReferralSchema.index({ referrerUserId:1, referredUserId:1, registrationId:1 }, { unique:true });

module.exports = mongoose.model('TalentReferral', TalentReferralSchema);
