require('dotenv').config();
const axios = require('axios');

const createPayment = async (req, res) => {
  const { order_id, order_amount, customer_details, order_note } = req.body;

  try {
    const body = {
      order_id,
      order_amount,
      order_currency: "INR",
      customer_details,
      order_note
    };

    const headers = {
      "x-client-id": process.env.CLIENT_ID,
      "x-client-secret": process.env.CLIENT_SECRET,
      "x-api-version": "2022-09-01",
      "Content-Type": "application/json"
    };

    const response = await axios.post(
      `${process.env.CASHFREE_BASE_URL}/pg/orders`,
      body,
      { headers }
    );

    // ✅ Send full response to frontend
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


const paymentVerify = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const url = `${process.env.CASHFREE_BASE_URL}/pg/orders/${orderId}/payments`;

    const response = await axios.get(url, {
      headers: {
        "x-client-id": process.env.CLIENT_ID,
        "x-client-secret": process.env.CLIENT_SECRET,
        "x-api-version": "2022-09-01",
      },
    });

    const orderData = response.data;

    res.status(200).json(orderData);
  } catch (error) {
    console.error("Fetch Order Error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Order fetch failed",
      detail: error.response?.data || error.message,
    });
  }
};


module.exports = { createPayment, paymentVerify };
