const User = require('../models/User');
const UserSubscription = require("../models/UserSubscription");
const ContestBooking = require("../models/ContestBooking");

const getUserReport = async (req, res) => {
  try {
    const { type, value } = req.query;
    let startDate, endDate;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine time range based on type
    if (type === '7days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      endDate = today;
    } else if (type === 'month') {
      const monthIndex = new Date(`${value} 1, 2025`).getMonth(); // e.g., january -> 0
      const year = new Date().getFullYear();
      startDate = new Date(year, monthIndex, 1);
      endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    } else if (type === 'year') {
      const year = parseInt(value);
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    // Common match filter for date range
    const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

    // Aggregated data
    const [totalUsers, premiumUsers, freeUsers, usersByGender, usersByState, usersByLanguage] = await Promise.all([
      User.countDocuments(dateFilter),
      User.countDocuments({ ...dateFilter, isPremium: true }),
      User.countDocuments({ ...dateFilter, isPremium: false }),

      User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$gender",
            count: { $sum: 1 }
          }
        }
      ]),

      User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$state",
            count: { $sum: 1 }
          }
        }
      ]),

      User.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$language",
            count: { $sum: 1 }
          }
        }
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        premiumUsers,
        freeUsers,
        usersByGender,
        usersByState,
        usersByLanguage,
        timeRange: { from: startDate, to: endDate }
      }
    });

  } catch (err) {
    console.error("User Report Error:", err);
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};

const getRevenueReport = async (req, res) => {
  try {
    const { range, month, year } = req.query;

    let fromDate, toDate;
    const now = new Date();
    const selectedMonth = month ? parseInt(month) - 1 : now.getMonth();
    const selectedYear = year ? parseInt(year) : now.getFullYear();

    const startOfDay = (date) => new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = (date) => new Date(date.setHours(23, 59, 59, 999));

    if (range === "7days") {
      toDate = new Date();
      fromDate = new Date(toDate);
      fromDate.setDate(toDate.getDate() - 7);
    } else if (range === "month" && month && year) {
      fromDate = new Date(selectedYear, selectedMonth, 1);
      toDate = new Date(selectedYear, selectedMonth + 1, 0);
    } else if (range === "year" && year) {
      fromDate = new Date(selectedYear, 0, 1);
      toDate = new Date(selectedYear + 1, 0, 0);
    }

    if (range && !["7days", "month", "year"].includes(range)) {
      return res.status(400).json({ error: "Invalid range parameter" });
    }

    if (fromDate && toDate) {
      fromDate = startOfDay(fromDate);
      toDate = endOfDay(toDate);
    }

    const dateFilter = fromDate && toDate ? { createdAt: { $gte: fromDate, $lte: toDate } } : {};
    const subscriptions = await UserSubscription.find(dateFilter).sort({ createdAt: -1 });

    const subscriptionRevenue = subscriptions.reduce(
      (sum, sub) => sum + (Number(sub.payAmount) || 0),
      0
    );
    const subscriptionCount = subscriptions.length;

    const billingCycleRevenue = { monthly: 0, "half-yearly": 0, yearly: 0 };
    const planRevenue = { "1_month": 0, "6_month": 0, "12_month": 0 };

    const planSummary = {
      Monthly: { users: 0, revenue: 0 },
      "Half-Yearly": { users: 0, revenue: 0 },
      Yearly: { users: 0, revenue: 0 },
    };

    subscriptions.forEach((sub) => {
      const amount = Number(sub.payAmount) || 0;
      const rawCycle = sub.billingCycle || "";
      const cycle = rawCycle.toLowerCase().replace(/[-_\s]/g, "");

      if (["monthly", "1m", "1month"].includes(cycle)) {
        billingCycleRevenue.monthly += amount;
        planRevenue["1_month"] += amount;
        planSummary.Monthly.users += 1;
        planSummary.Monthly.revenue += amount;
      } else if (["halfyearly", "6m", "6month"].includes(cycle)) {
        billingCycleRevenue["half-yearly"] += amount;
        planRevenue["6_month"] += amount;
        planSummary["Half-Yearly"].users += 1;
        planSummary["Half-Yearly"].revenue += amount;
      } else if (["yearly", "12m", "12month"].includes(cycle)) {
        billingCycleRevenue.yearly += amount;
        planRevenue["12_month"] += amount;
        planSummary.Yearly.users += 1;
        planSummary.Yearly.revenue += amount;
      }
    });

    const contestDateFilter = fromDate && toDate ? { bookingTime: { $gte: fromDate, $lte: toDate } } : {};
    const contests = await ContestBooking.find(contestDateFilter).sort({ bookingTime: -1 });

    const contestRevenue = contests.reduce(
      (sum, cb) => sum + (Number(cb.bookingAmout) || 0),
      0
    );
    const totalContestBooking = contests.length;
    const totalRevenue = subscriptionRevenue + contestRevenue;

    res.status(200).json({
      range,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      totalRevenue: totalRevenue.toFixed(2),
      subscriptionRevenue: subscriptionRevenue.toFixed(2),
      contestRevenue: contestRevenue.toFixed(2),
      totalContestBooking,
      subscriptionCount,
      billingCycleRevenue,
      planRevenue,
      planSummary: {
        Monthly: {
          users: planSummary.Monthly.users,
          revenue: planSummary.Monthly.revenue.toFixed(2),
        },
        "Half-Yearly": {
          users: planSummary["Half-Yearly"].users,
          revenue: planSummary["Half-Yearly"].revenue.toFixed(2),
        },
        Yearly: {
          users: planSummary.Yearly.users,
          revenue: planSummary.Yearly.revenue.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Revenue Report Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


module.exports = {
  getUserReport,
  getRevenueReport
};
