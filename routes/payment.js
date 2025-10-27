const express = require('express');
const { createPayment, paymentVerify } = require('../controllers/paymentController');
const verifyToken = require('../middleware/verifyToken');
const router = express.Router();


router.post('/create-order', createPayment);
router.post('/verify', paymentVerify);


module.exports = router;
