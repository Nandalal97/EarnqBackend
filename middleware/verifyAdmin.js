const jwt = require('jsonwebtoken');
const Admin = require('../models/admin/AdminModel');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const verifyAdminToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: 'Invalid auth format' });
  }

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.adminId).select('-password');
    if (!admin) return res.status(401).json({ message: 'Admin not found' });

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};



const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin || !allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ message: 'Forbidden: Role not allowed' });
    }
    next();
  };
};

module.exports = { verifyAdminToken, checkRole };
