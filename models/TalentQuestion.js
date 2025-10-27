const mongoose = require('mongoose');
const { Schema } = mongoose;

const TalentQuestionSchema = new Schema({
  contestId: { type: Schema.Types.ObjectId, ref: 'TalentContest', required: true, index: true },
  slotId: { type: String, required: true, index: true }, // exam slot

  questionText: { 
    type: Map, 
    of: String, 
    required: true 
  },

  options: [
    {
      optionText: { type: Map, of: String, required: true },
      isCorrect: { type: Boolean, default: false } 
    }
  ],

  questionType: { type: String, enum: ['mcq', 'text', 'numeric'], default: 'mcq' },
  marks: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }

}, { timestamps: true });

// Indexes for fast retrieval per contest + slot
TalentQuestionSchema.index({ contestId: 1, slotId: 1 });

module.exports = mongoose.model('TalentQuestion', TalentQuestionSchema);
