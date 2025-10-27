// routes/coinRoutes.js (or include in existing routes)
const express = require('express');
const router = express.Router();
const { getUserTotalCoins, reduceCoins } = require('../controllers/coinController');

router.get('/coins/:userId', getUserTotalCoins);
router.post('/coins/reduce', reduceCoins);


module.exports = router;
