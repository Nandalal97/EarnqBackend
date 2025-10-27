const Coupon = require('../models/Coupon');

// Create a new coupon
const createCoupon = async (req, res) => {
  try {
    const { code, discountType, value, minPurchase, maxUses, expiryDate, marketerId } = req.body;

    if (!code) return res.status(400).json({ message: 'Coupon code is required' });
    if (!discountType || !['percentage', 'fixed'].includes(discountType))
      return res.status(400).json({ message: 'Invalid discount type' });
    if (!value) return res.status(400).json({ message: 'Coupon value is required' });
    if (!expiryDate) return res.status(400).json({ message: 'Expiry date is required' });

    // Check if coupon already exists (case-insensitive)
    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) return res.status(400).json({ message: 'Coupon code already exists' });

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discountType,
      value,
      minPurchase: minPurchase || 0,
      maxUses: maxUses || 1,
      expiryDate: new Date(expiryDate),
      marketerId: marketerId || null
    });

    await coupon.save();
    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Validate a coupon for checkout
const validateCoupon = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;

    if (!code) return res.status(400).json({ message: 'Coupon code is required' });
    if (!totalAmount) return res.status(400).json({ message: 'Total amount is required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    if (new Date(coupon.expiryDate) < new Date()) return res.status(400).json({ message: 'Coupon expired' });
    if (coupon.usedCount >= coupon.maxUses) return res.status(400).json({ message: 'Coupon usage limit exceeded' });
    if (totalAmount < coupon.minPurchase) return res.status(400).json({ message: `Minimum purchase ₹${coupon.minPurchase} required` });

    let discount = 0;
    if (coupon.discountType === 'percentage') discount = (totalAmount * coupon.value) / 100;
    else discount = coupon.value;

    res.json({ message: 'Coupon valid', discount, coupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Increment used count after order
const incrementUsage = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) return res.status(400).json({ message: 'Coupon code is required' });

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

    coupon.usedCount += 1;
    await coupon.save();

    res.json({ message: 'Coupon usage incremented', coupon });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all coupons
const allCoupon = async (req, res) => {
  try {
    const coupons = await Coupon.find();
    res.json(coupons);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createCoupon,
  validateCoupon,
  incrementUsage,
  allCoupon
};
