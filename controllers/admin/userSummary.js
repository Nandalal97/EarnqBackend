const ReferralEarning = require('../../models/ReferralEarning');
const ReferralWithdrawal = require('../../models/ReferralWithdrawal');
const User = require("../../models/User");
const ContestWinner = require("../../models/winnerSchema");
const Contest = require("../../models/ContestModel");
const ContestBooking = require("../../models/ContestBooking");

const userSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Validate User
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ msg: "User not found" });

    // 2. Total referral earnings (credited)
    const totalEarningsAgg = await ReferralEarning.aggregate([
      { $match: { referrerId: user._id, status: 'credited' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalReferralEarnings = totalEarningsAgg[0]?.total || 0;

    // 3. Total withdrawal amounts by status
    const withdrawalAggs = await ReferralWithdrawal.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let totalWithdrawn = 0;
    let totalPending = 0;
    let totalApproved = 0;

    withdrawalAggs.forEach(entry => {
      if (entry._id === "completed") totalWithdrawn = entry.total;
      else if (entry._id === "pending") totalPending = entry.total;
      else if (entry._id === "approved") totalApproved = entry.total;
    });

    // 4. Available wallet balance
    const availableToWithdraw = user.wallet;

    // 5. Withdrawal history by status
    const [pendingWithdrawals, approvedWithdrawals, completedWithdrawals] = await Promise.all([
      ReferralWithdrawal.find({ userId: user._id, status: 'pending' })
        .sort({ requestedAt: -1 }).limit(10),
      ReferralWithdrawal.find({ userId: user._id, status: 'approved' })
        .sort({ requestedAt: -1 }).limit(10),
      ReferralWithdrawal.find({ userId: user._id, status: 'completed' })
        .sort({ requestedAt: -1 }).limit(10)
    ]);

    // 6. Total referred users
    let totalReferrals = 0;
    if (user.referralCode) {
      totalReferrals = await User.countDocuments({ referredBy: user.referralCode });
    }

    // 7. Contest winnings
    const contestWins = await ContestWinner.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("contestId", "title entryFee duration")
      .lean();

    // 8. Contest Participation
    const contestBookings = await ContestBooking.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("contestId", "title startTime endTime entryFee prizeAmount");

    const contestParticipation = contestBookings.map((booking) => ({
      contestId: booking.contestId?._id,
      title: booking.contestId?.title || "Unknown",
      entryFee: booking.contestId?.entryFee || "Unknown",
      prizeAmount: booking.contestId?.prizeAmount || "Unknown",
      bookedAt: booking.createdAt,
      attended: booking.isAttempted,
      bookingAt: booking.bookingTime || null,
      booked: booking.booked
    }));

    // ✅ Final response
    res.status(200).json({
      user: {
        _id: user._id,
        name: `${user.first_name} ${user.middle_name || ""} ${user.last_name}`.trim(),
        email: user.email,
        phone: user.phone_number,
        gender: user.gender,
        dob: user.dob,
        address: user.address,
        pin_code: user.pin_code,
        state: user.state,
        language: user.language,
        premium: user.isPremium,
        premiumExpire: user.premiumExpiry,
        referralCode: user.referralCode,
        joinedAt: user.createdAt,
        lastLogIn: user.lastLogin,
      },
      totalReferralEarnings,
      totalWithdrawn,
      totalPending,
      totalApproved,
      availableToWithdraw,
      withdrawalHistory: {
        pending: pendingWithdrawals,
        approved: approvedWithdrawals,
        completed: completedWithdrawals,
      },
      totalReferrals,
      contestWins,
      contestParticipation,
      msg: "User summary fetched successfully"
    });

  } catch (err) {
    console.error("User summary error:", err.message);
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

module.exports = { userSummary };
