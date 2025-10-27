const User = require("../../models/User");
const ReferralEarning = require("../../models/ReferralEarning");
const ReferralSettings = require("../../models/ReferralSettings");
const talentSearchReferralSummary = require("../../models/talentSearchReferralSummary");

// Signup Referral Bonus Function
const handleSignupReferral = async (newUserId, referrerCode) => {
  try {
    const newUser = await User.findById(newUserId);
    if (!newUser) throw new Error("New user not found");

    // Check if user is verified (email verified)
    if (!newUser.verified) {
      console.log("User not verified yet, bonus not given");
      return; 
    }
    const referrer = await User.findOne({ referralCode: referrerCode });
    if (!referrer) return; // Invalid referral

      // 🔹 settings DB থেকে নিয়ে আসা
    const settings = await ReferralSettings.findOne().sort({ createdAt: -1 });
    const referrerSignupBonus = settings?.referrerSignupBonus || 0;
    // 1. Signup Bonus for referrer (after verification)
    await ReferralEarning.create({
      referrerId: referrer._id,
      referredUserId: newUser._id,
      amount: referrerSignupBonus,
      type: "signupBonus",
      status: "credited",
      description: "Referral signup bonus (after verification)"
    });

    referrer.wallet += referrerSignupBonus;
    await referrer.save();
    console.log("Signup referral bonus credited successfully (after verification)");
  } catch (err) {
    console.error("Error in handleSignupReferral:", err.message);
  }
};


const handleReferralCommission = async (userId, amount) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.referralCommissionGiven || !user.referredBy) return;
    const referrer = await User.findOne({ referralCode: user.referredBy });
    if (!referrer) return;
    const settings = await ReferralSettings.findOne().sort({ createdAt: -1 });
    const referrerSubscriptionBonus = settings?.referrerSubscriptionBonus || 0;
    const subscriptionCommissionPercent = settings?.subscriptionCommissionPercent || 0;
    const commission = referrerSubscriptionBonus + (amount * subscriptionCommissionPercent / 100);

    // 10 + 5%
    // const commission = 10 + Math.floor(amount * 0.05);

    // Duplicate prevent
    const exists = await ReferralEarning.findOne({
      referrerId: referrer._id,
      referredUserId: user._id,
      type: "subscriptionCommission"
    });
    if (exists) return;

    await ReferralEarning.create({
      referrerId: referrer._id,
      referredUserId: user._id,
      amount: commission,
      type: "subscriptionCommission",
      description: `Commission from subscription of ₹${amount}`,
      status: "credited"
    });

    // referrer.wallet = (referrer.wallet || 0) + commission;
      referrer.wallet += commission;
    await referrer.save();

    user.referralCommissionGiven = true;
    await user.save();

    console.log("Referral commission credited successfully");
  } catch (err) {
    console.error("Error in handleReferralCommission:", err.message);
  }
};


const giveTalentReferralCommission = async (userId, contestId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.referredBy) return false;

    // 1️⃣ Find referrer
    const referrer = await User.findOne({ referralCode: user.referredBy });
    if (!referrer) return false;

    // 2️⃣ Commission amount
    const settings = await ReferralSettings.findOne().sort({ createdAt: -1 });
    const commissionAmount = settings?.talentSearchCommission || 0;
    if (commissionAmount <= 0) return false;

    // 3️⃣ Update summary atomically per contest
    const updatedSummary = await talentSearchReferralSummary.findOneAndUpdate(
      {
        referrerId: referrer._id,
        contestId,
        referredUsers: { $ne: user._id } // only if user not yet counted for this contest
      },
      {
        $inc: { totalReferred: 1, totalCommission: commissionAmount },
        $addToSet: { referredUsers: user._id }
      },
      { upsert: true, new: true }
    );

    if (!updatedSummary) {
      console.log(`User ${user.first_name} already counted for contest`);
      return false;
    }

    // 4️⃣ Add to wallet
    referrer.wallet = (referrer.wallet || 0) + commissionAmount;
    await referrer.save();

    // console.log(`✅ ₹${commissionAmount} added to ${referrer.first_name} for ${user.first_name} in contest ${contestId}`);
    return true;

  } catch (error) {
    console.error("🚨 Error giving referral commission:", error.message);
    return false;
  }
};

module.exports = { handleReferralCommission, handleSignupReferral, giveTalentReferralCommission };
