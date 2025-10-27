const mongoose = require('mongoose');
const { Schema } = mongoose;

const TalentBookingSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  gender: { type: String, trim: true },
  dob: { type: Date },
  examDate: { type: Date },
  contestId: { type: Schema.Types.ObjectId, required: true },
  slotId: { type: String, required: true },
  registrationAt: { type: Date, default: Date.now },
  examTaken: { type: Boolean, default: false },
  examTakenAt: { type: Date, default: null },
  score: { type: Number, default: 0 },
  password: { type: String },
  referralCode: { type: String, default: null },
  orderId: { type: String, default: null },
  isPaid:{ type: Boolean, default: false },
  status:{ type: String, default: 'Pending' },
   userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// ✅ Contest-wise unique registration
TalentBookingSchema.index({ contestId: 1, email: 1 }, { unique: true });
TalentBookingSchema.index({ contestId: 1, phone: 1 }, { unique: true });

// ✅ Slot-specific leaderboard
TalentBookingSchema.index({ contestId: 1, slotId: 1, score: -1 });

// ✅ Global leaderboard (fast rank calculation)
TalentBookingSchema.index({ contestId: 1, score: -1, examTakenAt: 1 });

// ✅ Partial index for only users who actually took exam
TalentBookingSchema.index(
  // { contestId: 1, score: -1, examTakenAt: 1 },
  { partialFilterExpression: { examTaken: true } }
);

module.exports = mongoose.model('TalentBooking', TalentBookingSchema);
