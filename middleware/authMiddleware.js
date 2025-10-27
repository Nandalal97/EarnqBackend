const jwt = require('jsonwebtoken');
const Session = require('../models/Sessions');

const verifyAuth = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1] || req.cookies.authToken;
    if (!token) {
      return res.status(401).json({status:0, msg: 'Unauthorized' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const session = await Session.findOne({ userId: decoded.id, token });
    if (!session) {
      return res.status(401).json({ status:false, msg: 'Your account was logged in on another device. You have been logged out here for security reasons. If this wasn’t you, please reset your password.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ msg: 'Invalid token or session expired' });
  }
};
module.exports = verifyAuth;
