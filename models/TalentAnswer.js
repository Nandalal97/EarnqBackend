const mongoose = require('mongoose');
const { Schema } = mongoose;

const TalentAnswerSchema = new Schema({
  bookingId: { type: Schema.Types.ObjectId, ref: 'TalentBooking', required: true },
  contestId: { type: Schema.Types.ObjectId, ref: 'TalentContest', required: true },
  slotId: { type: String, required: true },
  answers: [
    {
      questionId: { type: Schema.Types.ObjectId, required: true },
      selectedOptionIndex: { type: Number, default: null },
      textAnswer: { type: String, default: null },
      isCorrect: { type: Boolean, default: false },
      skipped: { type: Boolean, default: false }
    }
  ],
  totalScore: { type: Number, default: 0 },
  attemptedCount: { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  wrongCount: { type: Number, default: 0 }
}, { timestamps: true });

TalentAnswerSchema.index({ contestId: 1, slotId: 1, score: -1 });

module.exports = mongoose.model('TalentAnswer', TalentAnswerSchema);
