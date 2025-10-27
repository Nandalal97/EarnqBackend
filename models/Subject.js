const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
subjectName: {
    type: Map,
    of: String,
    required: true
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admins',
      required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
