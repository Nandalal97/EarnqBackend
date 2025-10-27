// routes/referral.js
const express = require('express');
const { validateUserWithdrawal } = require('../middleware/withdrawalValidation');
const { requestWithdrawal, updateWithdrawalStatus } = require('../controllers/referral/withdrawalController');
const { getReferralSummary, getReferralHistory, getSettings, updateSettings } = require('../controllers/referral/getReferralSummary');

const router = express.Router();

router.post('/withdraw', validateUserWithdrawal, requestWithdrawal );
router.put('/appove', updateWithdrawalStatus );
router.get('/summary/:userId', getReferralSummary );
router.get('/history/:referrerId', getReferralHistory );

// for admin panel refer setting
router.get("/referral-settings", getSettings);

// UPDATE settings
router.put("/update/referral-settings", updateSettings);

module.exports = router;
