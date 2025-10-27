const User = require("../../models/User");
const ReferralEarning = require("../../models/ReferralEarning");

const handleReferralCommission = async (userId, amount) => {
  const user = await User.findById(userId);
  if (!user || user.referralCommissionGiven || !user.referredBy) return;

  const referrer = await User.findOne({ referralCode: user.referredBy });
  if (!referrer) return;
 const commission = Math.floor(amount * 0.05); // 5%

  await ReferralEarning.create({
    referrerId: referrer._id,
    referredUserId: user._id,
    amount: commission,
    description: "First subscription bonus",
    status: "credited"
  });

  referrer.wallet += commission;
  await referrer.save();

  user.referralCommissionGiven = true;
  await user.save();
};

module.exports={handleReferralCommission}