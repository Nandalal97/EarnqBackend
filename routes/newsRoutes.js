const express = require('express');
const router = express.Router();
const { fetchAndInsertNews, getAllNews, getNewsById, getAllMCQs, getMCQById,getMCQByIdLang, getAllMCQsByLang, getFormattedNewsByLang,getNewsByDateMonthYear, updateMCQByLang, deleteMcq } = require('../controllers/newsController');

// Fetch & insert news manually (trigger ChatGPT + DB insert)
router.post('/fetch-news', fetchAndInsertNews);

// Get all formatted news
router.get('/all', getAllNews);

// Get single news by ID
router.get('/:id', getNewsById);

// All Mcq Current Affirce
router.get('/all/mcq', getAllMCQs);
router.get('/all/mcqs', getAllMCQsByLang);
router.delete("/mcq/delete/:id", deleteMcq)
router.put('/mcq/update/:id/:lang', updateMCQByLang);
router.get('/all/mcq/:id', getMCQById);
router.get("/mcq/:id/:lang", getMCQByIdLang);

// current affairs news
router.get('/all/current-news', getFormattedNewsByLang);

// Date, Month, Year wise
router.get("/current-affairs/table", getNewsByDateMonthYear);

module.exports = router;
// GET /api/news/all/mcqs?lang=en&page=1&limit=10&month=8&year=2025
// GET /api/news/all/mcqs?lang=bn&startDate=2025-01-01&endDate=2025-01-31

// http://localhost:5000/api/news/all/current-news?lang=bn&page=1&limit=10&startDate=2025-08-01&endDate=2025-09-01
// http://localhost:5000/api/news/all/current-news?lang=bn&page=1&limit=10&month=8&year=2025