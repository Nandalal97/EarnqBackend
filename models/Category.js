const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryName: {
    type: Map,
    of: String,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admins',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
