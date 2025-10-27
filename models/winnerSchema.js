const mongoose = require('mongoose');

const winnerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  score: { type: Number, required: true },
  rank: { type: Number, required: true },
  prizeAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
},{
    timestamps:true,
});

module.exports = mongoose.model('Winner', winnerSchema);
