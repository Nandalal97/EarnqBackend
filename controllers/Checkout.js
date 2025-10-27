const Cart = require("../models/Cart");
const Order = require("../models/orderSchema");
const Coupon = require("../models/Coupon");
const Book = require("../models/Book");
const ImageKit = require("imagekit");

const crypto = require("crypto");
const usedTokens = new Set();


const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC,
  privateKey: process.env.IMAGEKIT_PRIVATE,
  urlEndpoint: process.env.IMAGEKIT_URL
   
});


const readBook = async (req, res) => {
  try {
    const { userId, bookId, pageNo } = req.params;

    // ১. চেক করা যে user বইটি purchase করেছে
    const order = await Order.findOne({
      userId,
      status: "SUCCESS",
      "items.bookId": bookId
    });

    if (!order) {
      return res.status(403).json({ message: "You have not purchased this book" });
    }

    // ২. Book collection থেকে বইয়ের details fetch
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }

    // ৩. bookUrl field থেকে file path তৈরি
    // ধরুন book.bookUrl = "CA-2025"
    const filePath = `/books/${book.bookUrl}/${pageNo}.png`;

    // ৪. one-time token generate
    const token = crypto.randomBytes(16).toString("hex");
    if (usedTokens.has(token)) {
      return res.status(403).json({ message: "Link already used" });
    }
    usedTokens.add(token);

    // ৫. ImageKit signed URL generate
    const signedUrl = imagekit.url({
      path: filePath,
      signed: true,
      expireSeconds: 30, // short-lived URL
      queryParameters: { token }
    });

    // ৬. URL response এ পাঠানো
    return res.json({ url: signedUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


const placeOrder = async (req, res) => {
  try {
    const { userId, shippingAddress, PhoneNumber, status, transactionId, couponCode } = req.body;
    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (!coupon) return res.status(400).json({ message: "Invalid coupon" });
      if (coupon.expiryDate < new Date()) return res.status(400).json({ message: "Coupon expired" });
      if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: "Coupon usage limit exceeded" });
      if (cart.totalPrice < coupon.minPurchase) return res.status(400).json({ message: `Minimum purchase ₹${coupon.minPurchase} required` });
      discount = coupon.discountType === 'percentage'
        ? (cart.totalPrice * coupon.value) / 100
        : coupon.value;

      // increment usage
      coupon.usedCount += 1;
      await coupon.save();
    }

    const totalAmount = cart.totalPrice - discount;

    const newOrder = new Order({
      userId: cart.userId,
      items: cart.items,
      totalAmount: cart.totalPrice,
      finalAmount: totalAmount,
      totalItems: cart.totalItems,
      shippingAddress,
      PhoneNumber,
      coupon: couponCode || null,
      discount: discount || 0,
      status,
      transactionId
    });

    await newOrder.save();

    // clear cart
    cart.items = [];
    cart.totalPrice = 0;
    cart.totalItems = 0;
    await cart.save();

    res.status(201).json({ status: 1, message: "Order placed successfully", discount, totalAmount });
  } catch (err) {
    res.status(500).json({ status: 0, error: err.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params; // assuming userId comes from URL param

    const orders = await Order.find({ userId }).sort({ createdAt: -1 }); // latest first

    if (!orders || orders.length === 0) {
      return res.status(404).json({ status: 0, message: "No orders found" });
    }

    res.status(200).json({ status: 1, orders });
  } catch (err) {
    res.status(500).json({ status: 0, error: err.message });
  }
};


const bookdetails= async (req, res) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    return res.json({
      bookId: book._id,
      title: book.title,
      totalPages: book.totalPages,
      bookUrl: book.bookUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  placeOrder,
  getUserOrders,
  readBook,
  bookdetails
};
