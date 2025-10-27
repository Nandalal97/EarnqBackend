const express = require('express');
const { getMockTestQuestions, getQuestions,fetchQuestionsByIds, addMockQuestion, createMockTest, listMockTests,getMockTestCategories, finalSubmitMockTest, maxMockTestAttempts } = require('../controllers/mockTestController');
const router = express.Router();

// mocktest questins
router.post("/questions/add", addMockQuestion);
router.get("/questions/all", getQuestions);
// GET /api/mocktests/questions/all?subject=Geography&difficulty=easy&page=1&limit=20&lang=en



// mock tests for user
router.post('/create', createMockTest)
router.get('/listMockTests', listMockTests);
router.get('/categories', getMockTestCategories);
router.get('/questionSet', getMockTestQuestions);
router.get('/checkAttempts', maxMockTestAttempts);
router.post('/submitExam', finalSubmitMockTest);
router.get('/single-questions', fetchQuestionsByIds);


// Submit answers


module.exports = router;
