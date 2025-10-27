const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token after "Bearer"
  if (!token) {
    return res.status(401).json({ status: 0, msg: 'Unauthorized. Token missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // use your secret key

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ status: 0, msg: 'User not found.' });
    }

    // 🔁 Premium auto-downgrade if expired
    if (user.isPremium && user.premiumExpiry && new Date(user.premiumExpiry) < new Date()) {
      user.isPremium = false;
      user.premiumExpiry = null;
      await user.save();
    }

    req.user = {
      email: user.email,
      isPremium: user.isPremium,
    };

    next();
  } catch (err) {
    console.error(err);
    return res.status(403).json({ status: 0, msg: 'Invalid or expired token.' });
  }
}

module.exports = verifyToken;
