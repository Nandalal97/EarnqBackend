const express = require('express');
const router = express.Router();

const { checkRole, verifyAdminToken } = require('../../middleware/verifyAdmin');
const { registerAdmin, loginAdmin, sendOTP, otpVerify, updateAdmin, getSingleAdmin, getAllAdmins, deleteAdmin } = require('../../controllers/admin/adminAuthController');
const {  getAdminStats } = require('../../controllers/admin/getAdminStats');
const { getLatestUsers, getUserGenderStats, getMonthlyUserStats, getStateWiseUserStats } = require('../../controllers/userController');
const { getLatestContactsForDashboard } = require('../../controllers/contactController');
const { getAllWithdrawals } = require('../../controllers/referral/withdrawalController');
const { userSummary } = require('../../controllers/admin/userSummary');

// Public
router.post('/login', loginAdmin);
router.post('/otp/sendOtp',verifyAdminToken, sendOTP);
router.post('/otp/otpVerify',verifyAdminToken, otpVerify);

// routes/adminAuth.js
router.get('/verify-token', verifyAdminToken, async (req, res) => {
  try {
    // req.admin is set in your verifyAdminToken middleware
    res.json({ success: true, role: req.admin.role });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
});

// Protected (Only Superadmin can register new admins)
router.post('/register', verifyAdminToken, checkRole('Superadmin'), registerAdmin);
router.put('/update/:id', verifyAdminToken, updateAdmin);
router.get('/single/:id', getSingleAdmin);
router.get('/all', getAllAdmins);

router.delete('/delete/:id',verifyAdminToken, deleteAdmin);




router.get('/user-summary/:userId', userSummary);

router.get('/stats-overview', getAdminStats);
router.get('/latest-users', getLatestUsers);
router.get('/latest-contacts', getLatestContactsForDashboard);
router.get('/gender-stats', getUserGenderStats);
router.get('/monthly-user-stats', getMonthlyUserStats);
router.get('/user-state-stats', getStateWiseUserStats);

router.get('/withdrawals', getAllWithdrawals);

module.exports = router;
