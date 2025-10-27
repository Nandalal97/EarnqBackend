const ReferralEarning = require('../../models/ReferralEarning');
const ReferralWithdrawal = require('../../models/ReferralWithdrawal');
const User = require("../../models/User");
const ReferralSettings = require("../../models/ReferralSettings");
const getReferralSummary = async (req, res) => {
    try {
        const { userId } = req.params;

        // 1. Validate User
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ msg: "User not found" });

        // 2. Total referral earnings (credited)
        const totalEarningsAgg = await ReferralEarning.aggregate([
            { $match: { referrerId: user._id, status: 'credited' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalReferralEarnings = totalEarningsAgg[0]?.total || 0;

        // 3. Total withdrawn amount
        const totalWithdrawnAgg = await ReferralWithdrawal.aggregate([
            { $match: { userId: user._id, status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalWithdrawn = totalWithdrawnAgg[0]?.total || 0;

        // 4. Available balance (wallet)
        const availableToWithdraw = user.wallet;

        // 5. Withdrawal history (optional: sort by date)
        const withdrawalHistory = await ReferralWithdrawal.find({ userId: user._id })
            .sort({ requestedAt: -1 })
            .limit(10);

        // 6. Total referred users (who signed up using this user's referral)
        // 6. Total referred users (who signed up using this user's referral code)
        let totalReferrals = 0;
        if (user.referralCode) {
            totalReferrals = await User.countDocuments({ referredBy: user.referralCode });
        }

        // ✅ Send summary
        res.status(200).json({
            totalReferralEarnings,
            totalWithdrawn,
            availableToWithdraw,
            withdrawalHistory,
            totalReferrals,
            msg: "Referral summary fetched successfully"
        });

    } catch (err) {
        console.error("Referral summary error:", err.message);
        res.status(500).json({ msg: "Server error", error: err.message });
    }
};

// Earnings history for a referrer
const getReferralHistory = async (req, res) => {
  try {
    const { referrerId } = req.params;
    // All earnings for this referrer
    const earnings = await ReferralEarning.find({ referrerId })
      .populate("referredUserId", "first_name last_name email")
      .sort({ createdAt: -1 });

    if (!earnings.length) {
      return res.json({ status: 1, totalEarnings: 0, transactions: [] });
    }
    // Calculate total earning
    const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      status: 1,
      totalEarnings,
      transactions: earnings.map(e => ({
        amount: e.amount,
        type: e.type,
        status: e.status,
        description: e.description,
        referredUser: e.referredUserId 
          ? `${e.referredUserId.first_name} ${e.referredUserId.last_name}` 
          : null,
        email: e.referredUserId ? e.referredUserId.email : null,
        createdAt: e.createdAt
      }))
    });

  } catch (err) {
    console.error("Error fetching referral history:", err.message);
    res.status(500).json({ status: 0, msg: "Internal Server Error" });
  }
};


// referal setting
// Get current settings 
const getSettings = async (req, res) => {
  try {
    const settings = await ReferralSettings.findOne().sort({ createdAt: -1 });
    if (!settings) {
      return res.json({ msg: "No settings found, please create one" });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
}; 

// Update settings
const updateSettings = async (req, res) => {
  try {
    const { signupBonus, referrerSignupBonus, referrerSubscriptionBonus, subscriptionCommissionPercent,talentSearchCommission } = req.body;

    let settings = await ReferralSettings.findOne();
    if (!settings) {
      settings = new ReferralSettings({});
    }

    if (signupBonus !== undefined) settings.signupBonus = signupBonus;
    if (referrerSignupBonus !== undefined) settings.referrerSignupBonus = referrerSignupBonus;
    if (referrerSubscriptionBonus !== undefined) settings.referrerSubscriptionBonus = referrerSubscriptionBonus;
    if (subscriptionCommissionPercent !== undefined) settings.subscriptionCommissionPercent = subscriptionCommissionPercent;
    if (talentSearchCommission !== undefined) settings.talentSearchCommission = talentSearchCommission;

    await settings.save();
    res.json({ msg: "Referral settings updated successfully", settings });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


module.exports = { getReferralSummary, getReferralHistory, getSettings, updateSettings }
