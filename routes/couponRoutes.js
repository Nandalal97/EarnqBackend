const express = require('express');
const { createCoupon, validateCoupon, incrementUsage, allCoupon } = require('../controllers/couponController');
const router = express.Router();

// Admin / Marketer routes
router.post('/create', createCoupon);

// Validate a coupon at checkout
router.post('/validate', validateCoupon);

// Increment coupon usage after order success
router.post('/increment', incrementUsage);

// Get all coupons
router.get('/all', allCoupon);

module.exports = router;
