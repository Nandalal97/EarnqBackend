const mongoose = require('mongoose');

const signupAttemptSchema = new mongoose.Schema({
  deviceId: String,
  ip: String,
  attempts: { type: Number, default: 0 },
  suspended: { type: Boolean, default: false },
  lastAttempt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SignupAttempt', signupAttemptSchema);
