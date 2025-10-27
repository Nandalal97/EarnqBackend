// controllers/bookPaymentController.js
const Payment = require("../models/paymentSchema");
const Order = require("../models/orderSchema");
const User = require('../models/User');

// Create Payment & Update Order
const makePayment = async (req, res) => {
  try {
    const { transactionId, userId, amount, method, status, gatewayResponse } = req.body;

    // ✅ Validate required fields
    if (!transactionId || !userId || !amount || !method || !status) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

     const existUser = await User.findById(userId);
        if (!existUser) return res.status(404).json({ msg: 'User not found' });

         // Check for duplicate transaction
            const existingTransaction = await Payment.findOne({ transactionId });
            if (existingTransaction) {
              return res.status(400).json({ msg: 'Duplicate transaction.', status: 0 });
            }

    // ✅ Save payment record
    const payment = new Payment({
      transactionId,
      userId,
      amount,
      method,
      status,
      gatewayResponse,
    });

    await payment.save();

    // ✅ Decide new order status based on payment status
    let newOrderStatus = "Pending";

    if (status === "Success" || status === "Completed") {
      newOrderStatus = "Completed";
    } else if (status === "Processing") {
      newOrderStatus = "Processing";
    } else if (status === "Failed" || status === "Cancelled") {
      newOrderStatus = "Cancelled";
    }

    // Update order table with transactionId & status
    const updatedOrder = await Order.findByIdAndUpdate(
      transactionId,
      {
        $set: {
          status: newOrderStatus,
          transactionId: transactionId,
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found for this payment",
      });
    }

    // Success Response
    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
      payment,
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Payment Create Error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

// Fetch payment by transactionId
const getPaymentById = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const payment = await Payment.findOne({ transactionId });

    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.status(200).json({ success: true, payment });
  } catch (err) {
    console.error("GetPayment Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

// ✅ Fetch all payments of a user
const getPaymentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const payments = await Payment.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, payments });
  } catch (err) {
    console.error("GetUserPayments Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


// ✅ Daily revenue report
const getDailyReport = async (req, res) => {
  try {
    const report = await Payment.aggregate([
      { $match: { status: "Success" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalRevenue: { $sum: "$amount" },
          totalPayments: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({ success: true, report });
  } catch (err) {
    console.error("DailyReport Error:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};


module.exports = {
  makePayment,
  getPaymentById,
  getPaymentsByUser,
  getDailyReport
};
