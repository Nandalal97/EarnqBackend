const mongoose = require('mongoose');
const translationSchema = new mongoose.Schema({
  question: { type: String},
  options: {
    A: { type: String},
    B: { type: String},
    C: { type: String},
    D: { type: String }
  },
  explanation: { type: String}
}, { _id: false });

const questionSchema = new mongoose.Schema({
  question_id: { type: String, required: true, unique: true },
category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  correct_option: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true
  },
  translations: {
    en: translationSchema,
    hi: translationSchema,
    bn: translationSchema,
    gu: translationSchema,
    mr: translationSchema,
    ta: translationSchema,
    te: translationSchema,
    kn: translationSchema,
    or: translationSchema,
    pa: translationSchema
  }
}, {
  timestamps: true
});

questionSchema.index({ category: 1, subject: 1 });

module.exports = mongoose.model('Question', questionSchema);
