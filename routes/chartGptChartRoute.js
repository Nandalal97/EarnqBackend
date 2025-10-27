// routes/coinRoutes.js (or include in existing routes)
const express = require('express');
const { ChartGptApi, AnalyzeAnswer } = require('../controllers/chartGptApi');
const router = express.Router();


router.post('/ask-gpt', ChartGptApi);
router.post('/analyze-answer', AnalyzeAnswer);


module.exports = router;
