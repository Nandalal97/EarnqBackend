const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
   
  },
  name: {
    type: String
  },
  number: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true, 
    trim: true
  },
  subject: {
    type: String,
    trim: true
  },
  message: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('contacts', contactSchema);
