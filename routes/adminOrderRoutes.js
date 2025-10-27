const express = require('express');
const router = express.Router();
const {getOrderBooks, getOrderDetailsById, updateOrderStatus} = require('../controllers/bookController');


//book order details for admin panel
router.get("/orders/all", getOrderBooks);
router.get("/orders/:id", getOrderDetailsById);
router.put("/orders/:id/status", updateOrderStatus);

module.exports = router;
