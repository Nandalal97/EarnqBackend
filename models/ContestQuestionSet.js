const mongoose = require('mongoose');

const ContestQuestionSet = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'bn', 'mr', 'ta', 'te', 'gu', 'kn', 'or', 'pa'],
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
}, { timestamps: true });

module.exports = mongoose.model('ContestQuestionSet', ContestQuestionSet);
