require('dotenv').config();
const axios = require('axios');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.CASHFREE_BASE_URL) {
  throw new Error("Missing required environment variables");
}

const createPayment= async (req, res) => {
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
      'https://sandbox.cashfree.com/pg/orders',
      body,
      { headers }
    );
    // console.log("Cashfree order response:", response.data);
    res.json(response.data);
  } catch (error) {
    console.error("Session error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(500).json({
      error: "Session creation failed",
      details: error.response?.data || error.message
    });
  }
};


const paymentVerify= async (req, res) => {
  try {
    const { orderId } = req.body;

     if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }

   const response = await axios.get(`https://sandbox.cashfree.com/pg/orders/${orderId}/payments`, {
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


module.exports = { createPayment, paymentVerify };
