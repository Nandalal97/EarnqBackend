const SignupAttempt = require('../models/SignupAttempt');

const MAX_ATTEMPTS = 50;
const SUSPEND_DURATION = 90 * 24 * 60 * 60 * 1000; // 90 days in ms

const checkSignupAttempts = async (req, res, next) => {
  const deviceId = req.body.deviceId;
  const ip = req.ip;

  let record = await SignupAttempt.findOne({ deviceId });

  if (!record) {
    record = await SignupAttempt.create({ deviceId, ip });
  }

  if (record.suspended) {
    const timeSince = Date.now() - record.lastAttempt;
    if (timeSince < SUSPEND_DURATION) {
      return res.status(403).json({
        msg: 'Device temporarily suspended due to too many signup attempts.',
        status: 0
      });
    }
    record.suspended = false;
    record.attempts = 0;
  }

  record.attempts += 1;
  record.lastAttempt = Date.now();

  if (record.attempts === 3) {
    res.set('X-Warning', 'Warning: multiple signup attempts detected. Continued attempts may suspend your device.');
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    record.suspended = true;
  }

  await record.save();
  next();
};
module.exports = checkSignupAttempts;
