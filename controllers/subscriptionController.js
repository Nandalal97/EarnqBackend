
const Payment = require('../models/Payment');
const UserSubscription = require('../models/UserSubscription');
const PremiumCoins = require('../models/userPremiumCoin');
const User = require('../models/User');
const { handleReferralCommission } = require('../controllers/referral/referralController');

const handleSubscription = async (req, res) => {
  const {
    userId,
    planCode,
    billingCycle,
    transactionId,
    basePrice,
    discounts,
    payAmount,
    paymentMethod,
    paymentStatus // 'success', 'failed', 'pending'
  } = req.body;

  try {
    const existUser = await User.findById(userId);
    if (!existUser) return res.status(404).json({ msg: 'User not found' });

    // Check for duplicate transaction
    const existingTransaction = await Payment.findOne({ transactionId });
    if (existingTransaction) {
      return res.status(400).json({ msg: 'Duplicate transaction.', status: 0 });
    }

    // Save payment
    const payment = new Payment({
      userId,
      transactionId,
      basePrice,
      discounts,
      payAmount,
      paymentMethod,
      paymentStatus
    });
    await payment.save();


    // Calculate dates
    const startDate = new Date();
    const endDate = new Date(startDate);
    let months = 0;

    if (billingCycle === 'Monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
      months = 1;
    } else if (billingCycle === 'Half-Yearly') {
      endDate.setMonth(endDate.getMonth() + 6);
      months = 6;
    } else if (billingCycle === 'Yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
      months = 12;
    } else {
      return res.status(400).json({ error: 'Invalid billing cycle' });
    }

    // Update user
    await User.findByIdAndUpdate(userId, {
      isPremium: true,
      premiumExpiry: endDate
    });

    // First purchase referral commission
    if (!existUser.hasPurchased) {
      await handleReferralCommission(existUser._id, payAmount);
      existUser.hasPurchased = true;
      await existUser.save(); // ✅ Persist updated field
    }

    // Deactivate previous subscription
    const current = await UserSubscription.findOne({ userId, isActive: true });
    if (current) {
      current.isActive = false;
      await current.save();
    }

    // Save new subscription
    const subscription = new UserSubscription({
      userId,
      planCode,
      billingCycle,
      startDate,
      endDate,
      transactionId,
      basePrice,
      discounts,
      payAmount,
      isActive: true
    });
    await subscription.save();

    // 💰 Save premium coin grant
    const totalPremiumCoins = months * 30000;

    // Remove old record if exists (reset)
    await PremiumCoins.findOneAndDelete({ userId });

    const premiumCoins = new PremiumCoins({
      userId,
      startDate,
      expireDate: endDate,
      totalPremiumCoins
    });
    await premiumCoins.save();

    // ✅ Send success response
    res.status(201).json({
      success:true,
      status:1,
      msg: 'Subscription successful',
      payment,
      subscription,
      existUser
    });

  } catch (err) {
    res.status(500).json({success:false,status:0, error: 'Server error', msg: err.message });
  }
};


const getAllSubscription = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      email = '',
      phone = '',
      date,
      month,
      year
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    let query = { isActive: true };

    // ✅ Date filter
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.startDate = { $gte: start, $lte: end };
    } else if (month && year) {
      const start = new Date(`${year}-${month}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      query.startDate = { $gte: start, $lt: end };
    } else if (year) {
      const start = new Date(`${year}-01-01`);
      const end = new Date(`${parseInt(year) + 1}-01-01`);
      query.startDate = { $gte: start, $lt: end };
    }

    // ✅ Get subscriptions by query
    const subscriptions = await UserSubscription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // ✅ Fetch & filter users
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const user = await User.findById(sub.userId).select('first_name middle_name last_name email phone_number');

        // Filter by email/phone
        if (email && !user?.email?.toLowerCase().includes(email.toLowerCase())) return null;
        if (phone && !user?.phone_number?.includes(phone)) return null;

        return {
            userId: user?._id || '',
          fullName: `${user?.first_name || ''} ${user?.middle_name || ''} ${user?.last_name || ''}`.trim(),
          email: user?.email || '',
          phone: user?.phone_number || '',
          billingCycle: sub.billingCycle,
          startDate: sub.startDate,
          endDate: sub.endDate,
          basePrice: sub.basePrice,
          discount: sub.discounts,
          payAmount: sub.payAmount,
        };
      })
    );

    const filteredResults = results.filter(Boolean);

    res.status(200).json({
      success: true,
      page: parseInt(page),
      limit: parseInt(limit),
      count: filteredResults.length,
      subscriptions: filteredResults,
    });
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subscriptions',
    });
  }
};

const getUserSubscriptionDetails = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch user info
    const user = await User.findById(userId).select('first_name last_name email phone_number');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Fetch subscriptions and payments
    const subscriptions = await UserSubscription.find({ userId }).sort({ createdAt: -1 });
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });

    // Map payments by transaction/order ID
     // Map payments by orderId or transactionId
    const paymentMap = {};
    for (const pay of payments) {
      paymentMap[pay.transactionId] = {
        paymentMethod: pay.paymentMethod,
        paymentStatus: pay.paymentStatus
      };
    }
    // Attach payment method to each subscription
    const enrichedSubscriptions = subscriptions.map(sub => ({
      planCode: sub.planCode,
      billingCycle: sub.billingCycle,
      startDate: sub.startDate,
      endDate: sub.endDate,
      ordId: sub.transactionId,
      basePrice: sub.basePrice,
      discounts: sub.discounts,
      isActive: sub.isActive,
      payAmount: sub.payAmount,
      payments: paymentMap[sub.transactionId] || 'N/A',
     
    }));

    return res.status(200).json({
      success: true,
      user: {
        userId: user._id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone: user.phone_number,
      },
      subscriptions: enrichedSubscriptions
      // payments
    });

  } catch (error) {
    console.error('Error fetching user subscription details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription details'
    });
  }
};

module.exports = { handleSubscription, getAllSubscription, getUserSubscriptionDetails };
