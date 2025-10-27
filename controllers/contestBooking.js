
require('dotenv').config();
const axios = require('axios');
const Contest = require("../models/ContestModel");
const Booking = require('../models/ContestBooking')


if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.CASHFREE_BASE_URL) {
  throw new Error("Missing required environment variables");
}
const contestBookingOrder = async (req, res) => {
  const { order_id, order_amount, customer_details, order_note } = req.body;

  try {
    const body = {
      order_id,
      order_amount,
      order_currency: 'INR',
      customer_details,
      order_note
    };

    const headers = {
      'x-client-id': process.env.CLIENT_ID,
      'x-client-secret': process.env.CLIENT_SECRET,
      'x-api-version': '2022-09-01',
      'Content-Type': 'application/json'
    };

    const response = await axios.post(
      `${process.env.CASHFREE_BASE_URL}/pg/orders`,
      body,
      { headers }
    );

    // console.log("Cashfree order response:", response.data);
    // res.json(response.data);
     res.json({
      success: true,
      order_id: response.data.order_id,
      payment_session_id: response.data.payment_session_id, // important!
      cashfree_response: response.data
    });
  } catch (error) {
    console.error("Cashfree create order error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create Cashfree order",
      error: error.response?.data || error.message
    });
  }
};

const bookingVerify = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const response = await axios.get(`${process.env.CASHFREE_BASE_URL}/pg/orders/${orderId}/payments`, {
      headers: {
        'x-client-id': process.env.CLIENT_ID,
        'x-client-secret': process.env.CLIENT_SECRET,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json',
      }
    });
    const orderData = response.data;
    // console.log("Verified Order:", orderData);

    res.status(200).json(orderData);
  } catch (error) {
    console.error("Fetch Order Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Order fetch failed", detail: error.response?.data || error.message });
  }
}

const bookContest = async (req, res) => {
  try {
    const { contestId, orderID, userId, bookingAmout, paymentStatus, paymentDetails } = req.body;

    const contest = await Contest.findById(contestId);
    if (!contest) return res.status(400).json({ msg: "Booking closed." });

    const existing = await Booking.findOne({ contestId, userId });
    if (existing) {
      return res.status(400).json({ message: "Already booked." });
    }
    const newBooking = new Booking({
      contestId,
      orderID,
      userId,
      bookingAmout,
      paymentStatus,
      paymentDetails,
      booked: true
    });
    await newBooking.save();
    // Send success response
    res.status(201).json({
      success: true,
      status: 1,
      msg: 'Booking successful',
      newBooking,

    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};
const getUserBookingStatus = async (req, res) => {
  try {
    const { contestId, userId } = req.query;

    // 1. Find booking
    const findBooking = await Booking.findOne({ userId, contestId });

    if (!findBooking) {
      return res.json({ status: 0, msg: "not booked" });
    }

    // 2. Fetch contest
    const contest = await Contest.findById(contestId);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }

    const now = new Date();
    const startTime = new Date(contest.startTime);
    const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);

    // 3. Determine if user can join
    // console.log(findBooking.paymentStatus );

    const canJoin =
      findBooking.booked === true &&
      findBooking.paymentStatus === 'SUCCESS' &&
      now >= startTime &&
      now <= endTime;

    res.json({
      status: 1,
      msg: 'booked',
      userId,
      contestId,
      contestStarted: now >= startTime,
      canJoin,
      isBooked: findBooking.booked,
      isAttempted: findBooking.isAttempted || false,
    });

  } catch (err) {
    console.error('Booking status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
const markAttempted = async (req, res) => {
  try {
    const { userId, contestId } = req.body;

    if (!userId || !contestId) {
      return res.status(400).json({ message: 'Missing userId or contestId' });
    }

    const result = await Booking.findOneAndUpdate(
      { userId, contestId },
      { $set: { isAttempted: true } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ success: true, message: 'Marked as attempted' });
  } catch (error) {
    console.error('Error updating isAttempted:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const getContestStats = async (req, res) => {
  try {
    const contests = await Contest.find({}); // Fetch all contests
    const now = new Date();

    const data = await Promise.all(
      contests.map(async (contest) => {
        const bookings = await Booking.find({
          contestId: contest._id,
          paymentStatus: "SUCCESS",
          booked: true,
        });

        const totalBookings = bookings.length;

        const totalOrderAmount = bookings.reduce((sum, booking) => {
          return sum + (parseFloat(booking.bookingAmout) || 0); // Ensure orderAmout is numeric
        }, 0);

        const startTime = new Date(contest.startTime);
        const endTime = new Date(startTime.getTime() + contest.duration * 60 * 1000);
        const isExpired = now > endTime;

        return {
          contestId: contest._id,
          title: contest.title,
          totalBookings,
          totalOrderAmount,
          isExpired,
        };
      })
    );

    res.json({ success: true, data });
  } catch (err) {
    console.error("Error fetching contest stats:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// GET /api/admin/contest/:id/bookings
// GET /contest/:id/bookings?page=1&limit=20
const getContestBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Booking.countDocuments({ contestId: id });

    const bookings = await Booking.find({ contestId: id })
      .populate('userId', 'email phone_number isPremium')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: bookings,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};







module.exports = { contestBookingOrder, bookingVerify, bookContest, getUserBookingStatus, markAttempted, getContestStats, getContestBookings }