const JWT = require("jsonwebtoken");
const User = require("../models/User");
const { handleSignupReferral } = require("./referral/referralController");

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ status: 0, msg: "No token provided" });

    const decoded = JWT.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });

    if (!user) return res.status(404).json({ status: 0, msg: "User not found" });
    if (user.verified) return res.json({ status: 1, msg: "Email already verified" });

    user.verified = true;
    await user.save();

     if (user.referredBy) {
      await handleSignupReferral(user._id, user.referredBy);
    }

    return res.json({ status: 1, msg: "Email successfully verified" });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 0,
        msg: "Verification link expired. Please request a new one.",
      });
    }
    return res.status(400).json({ status: 0, msg: "Invalid or expired token" });
  }
};

module.exports = verifyEmail;
