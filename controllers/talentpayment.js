require('dotenv').config();
const axios = require('axios');
const TalentPayment = require('../models/TalentPayments');
const referralController = require('./affiliateController');

// Create a payment record
const createPayment = async (req, res) => {
  const {order_id, order_amount,customer_details, order_note } = req.body;
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
      // const response = await axios.post(
      //   'https://sandbox.cashfree.com/pg/orders',
      //   body,
      //   { headers }
      // );
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

// verify payment 
const paymentVerify= async (req, res) => {
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
    // console.log("payment status:", orderData.payment_status);

    res.status(200).json(orderData);
  } catch (error) {
    console.error("Fetch Order Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Order fetch failed", detail: error.response?.data || error.message });
  }
}

// inset data payment table 
const paymentData = async (req, res) => {
  try {
    const { orderId, bookingId, amount, status } = req.body;

    // ✅ Atomic operation: insert if not exists
    const payment = await TalentPayment.findOneAndUpdate(
      { orderId },                                        // match order
      { $setOnInsert: { bookingId, amount, status } },     // insert only if not found
      { new: true, upsert: true }                          // return existing or newly created doc
    );
    // If it already existed, inform the client
    const isNew = payment.isNew === undefined ? false : payment.isNew;

    res.status(200).json({
      message: isNew ? 'Payment record created' : 'Payment already recorded',
      payment
    });

  } catch (error) {
    // ✅ Handle duplicate key error (safety net)
    if (error.code === 11000) {
      const existingPayment = await TalentPayment.findOne({ orderId });
      return res.status(200).json({
        message: 'Payment already recorded',
        payment: existingPayment
      });
    }

    console.error('Payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update payment status
const updatePaymentStatus = async (req, res) => {
 try {
    const { paymentId, status, paidAt } = req.body;

    const payment = await TalentPayment.findByIdAndUpdate(paymentId, {
      status,
      paidAt: paidAt || new Date()
    }, { new: true });

    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // If payment successful, create referral commission
    if (status === 'paid') {
      await referralController.createReferralIfAny(payment.registrationId, payment._id);
    }

    res.json({ message: 'Payment updated', payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports={
    createPayment,
    paymentVerify,
    paymentData,
    updatePaymentStatus
}