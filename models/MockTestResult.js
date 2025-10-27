const mongoose = require("mongoose");

const UserAnswerSchema = new mongoose.Schema({
  mockTestId: { type: mongoose.Schema.Types.ObjectId, ref: "MockTest", required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, ref: "MockTestQuestions", required: true },
      selectedOption: { type: String, default: null },
      status: { type: String, enum: ["attempted", "notAttempted", "marked"], default: "notAttempted" },
      isCorrect: { type: Boolean, default: false },
    },
  ],
  attemptedCount: { type: Number, default: 0 },
  notAttemptedCount: { type: Number, default: 0 },
  markedCount: { type: Number, default: 0 },
  rightCount: { type: Number, default: 0 },
  wrongCount: { type: Number, default: 0 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  timeTaken: { type: Number, default: 0 }, // in seconds
  maxAttempt: { type: Number, default: 0 },
}, {
  timestamps: true, // adds createdAt and updatedAt
});

// Optional compound index to speed up queries
UserAnswerSchema.index({ userId: 1, mockTestId: 1 });

module.exports = mongoose.model("MockTestResults", UserAnswerSchema);
