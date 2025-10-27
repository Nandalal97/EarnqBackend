// models/ContestSubmission.js
const mongoose = require('mongoose');

const ContestSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true  },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true ,index: true },
  totalAnswer: { type: Number, required: true },
  correct: { type: Number, required: true },
  wrong: { type: Number, required: true },
  skipped: { type: Number, required: true },
  score: { type: Number, required: true },
  answers: { type: Object },
  timeTaken: { type: Number }, // In seconds, optional
  isWinner: { type: Boolean, default: false },
  rank: { type: Number },
  isSubmit: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});
ContestSubmissionSchema.index({ userId: 1, contestId: 1 }, { unique: true });
module.exports = mongoose.model('ContestSubmission', ContestSubmissionSchema);
