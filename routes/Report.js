const express = require('express');
const { getUserReport, getRevenueReport } = require('../controllers/reportController');
const router = express.Router();



router.get('/user-report',getUserReport);
router.get("/revenue", getRevenueReport);

module.exports = router;
