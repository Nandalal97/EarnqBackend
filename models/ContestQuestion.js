const mongoose = require('mongoose');

const ContestQuestionSchema = new mongoose.Schema({
  questionSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ContestQuestionSet',
    required: true,
  },
  questionText: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (val) => val.length >= 2 && val.length <= 6,
      message: 'Options must be between 2 and 6',
    },
  },
  correctAnswer: {
    type: Number,
    required: true,
    validate: {
      validator: function (val) {
        return this.options && val >= 0 && val < this.options.length;
      },
      message: 'Correct answer index must match options array length',
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
}, { timestamps: true });

// ✅ Add index to speed up queries by questionSetId
ContestQuestionSchema.index({ questionSetId: 1 });

module.exports = mongoose.model('ContestQuestion', ContestQuestionSchema);

