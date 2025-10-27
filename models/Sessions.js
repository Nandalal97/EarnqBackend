const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(+new Date() + 7*24*60*60*1000) } // optional
});

module.exports = mongoose.model('Session', sessionSchema);
