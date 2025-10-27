const mongoose = require('mongoose');

const userCoinsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  totalcoins: { 
    type: Number, 
    default: 0 
  },
  totalEarned: { 
    type: Number, 
    default: 0 
  },
  totalLost: { 
    type: Number, 
    default: 0 
  },
  correctAnswers: {         // ✅ New field
    type: Number,
    default: 0
  },
  wrongAnswers: {           // ✅ New field
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('UserCoins', userCoinsSchema);

