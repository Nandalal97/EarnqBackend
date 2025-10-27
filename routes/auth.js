// routes/auth.js

const express = require("express");
const router = express.Router();

const { register, login, resendVerificationEmail, logout, checkSession, forgotPassword, resetPassword  } = require("../controllers/authController");
const { validateUserRegistration, validateUserLogin } = require("../middleware/userValidation");
const verifyToken = require("../middleware/verifyToken");
const verifyAuth = require('../middleware/authMiddleware');
const verifyEmail = require("../controllers/verifyEmailController");
const checkSignupAttempts = require("../middleware/checkSignupAttempts");


router.post("/register",checkSignupAttempts, validateUserRegistration, register);
router.post("/login", validateUserLogin, login);
router.get('/check-session',verifyAuth, checkSession);
router.get('/logout', logout);
router.get("/verify-email", verifyEmail);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
// Example controller
router.get('/dashboard', verifyToken, (req, res) => {
  res.json({ msg: 'Welcome to your dashboard!', user: req.user });
});

module.exports = router;
