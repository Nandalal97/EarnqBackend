const mongoose = require('mongoose');
const { Schema } = mongoose;

const TalentContestSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  entryFee: { type: Number, default: 100 },
  maxParticipantsPerSlot: { type: Number, default: 500 },
  totalSlots: { type: Number, default: 6 },
  duration: { type: Number, default: 60 },
  isActive: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId,ref: 'Admin',required: true}
}, { timestamps: true });

// Indexes
TalentContestSchema.index({ startDate: 1 });
TalentContestSchema.index({ endDate: 1 });

module.exports = mongoose.model('TalentContest', TalentContestSchema);
