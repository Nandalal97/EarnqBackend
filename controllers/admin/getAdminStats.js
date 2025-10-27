const User = require('../../models/User');
const Question = require('../../models/Question');
const Contest = require('../../models/ContestModel');
const Booking = require('../../models/ContestBooking');
const Contact = require('../../models/contactModel');
const UserSubscription = require('../../models/UserSubscription');

const getAdminStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalUsers,
      premiumUsers,
      last7DaysUsers,
      todayUsers,
      totalQuestions,
      totalContests,
      totalBookings,
      totalContacts
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isPremium: true }),
      User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: today } }),
      Question.countDocuments(),
      Contest.countDocuments(),
      Booking.countDocuments(),
      Contact.countDocuments()
    ]);

    // 💰 Revenue calculations
    let subscriptionRevenue = 0;
    let contestRevenue = 0;

    try {
      // Subscription Revenue
      const subResult = await UserSubscription.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$payAmount' }
          }
        }
      ]);
      subscriptionRevenue = subResult[0]?.total || 0;

      // Contest Booking Revenue (convert string to number)
      const bookingResult = await Booking.aggregate([
        { $match: { paymentStatus: 'SUCCESS' } },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $toDouble: '$bookingAmout'
              }
            }
          }
        }
      ]);
      contestRevenue = bookingResult[0]?.total || 0;

    } catch (err) {
      console.error('Revenue calculation failed:', err.message);
    }

    const totalRevenue = subscriptionRevenue + contestRevenue;

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        premiumUsers,
        last7DaysUsers,
        todayUsers,
        totalQuestions,
        totalContests,
        totalBookings,
        totalContacts,
        subscriptionRevenue,
        contestRevenue,
        totalRevenue
      }
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

module.exports = { getAdminStats };
