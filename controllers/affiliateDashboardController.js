const Affiliate = require('../models/AffiliateUser');
const Referral = require('../models/Referral');
const TalentBooking = require('../models/TalentBooking');
const TalentPayment = require('../models/TalentPayments');

const getAffiliateDashboard = async (req, res) => {
  try {
    const { referralCode } = req.params;

    // Find affiliate by referralCode
    const affiliate = await Affiliate.findOne({ referralCode });
    if (!affiliate) return res.status(404).json({ message: 'Affiliate not found' });

    // Get all referrals
    const referrals = await Referral.find({ referrerUserId: affiliate._id })
      .populate({
        path: 'referredRegistrationId',
        select: 'name email phone contestId slotId'
      })
      .populate({
        path: 'paymentId',
        select: 'amount status paidAt'
      })
      .sort({ createdAt: -1 });

    // Summarize dashboard
    const totalReferrals = affiliate.totalReferrals;
    const totalCommission = affiliate.totalCommissionEarned;
    const pendingCommission = referrals
      .filter(r => r.payoutStatus === 'pending')
      .reduce((sum, r) => sum + r.commissionAmount, 0);

    res.json({
      affiliate: {
        name: affiliate.name,
        email: affiliate.email,
        referralCode: affiliate.referralCode
      },
      totalReferrals,
      totalCommission,
      pendingCommission,
      referrals
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports={
    getAffiliateDashboard
}