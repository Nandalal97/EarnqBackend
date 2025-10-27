const mongoose = require('mongoose');

const MockTestSchema = new mongoose.Schema({
  title: {
    en: { type: String, required: true },
    hi: { type: String },
    bn: { type: String }
  },
  subjects: [{ type: String, index: true }], 
  category: { type: String, index: true }, 
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MockTestQuestions' }], 
  duration: { type: Number, default: 60 },         // in minutes
  isPremium: { type: Boolean, default: false, index: true },
  startTime: { type: Date, index: true },
  endTime: { type: Date },
  isActive: { type: Boolean, default: false},
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin'},
  createdAt: { type: Date, default: Date.now},
});

// Compound index for faster queries: e.g., filter by subject + premium + date
MockTestSchema.index({ category: 1, isPremium: 1, isActive: 1 });
MockTestSchema.index({ subjects: 1, isPremium: 1 });
MockTestSchema.index({ createdAt: 1 });

// Optional: text index on title for search
MockTestSchema.index({ "title.en": "text", "title.hi": "text", "title.bn": "text" });

module.exports = mongoose.model('MockTest', MockTestSchema);
