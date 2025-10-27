const express = require('express');
const router = express.Router();
const { submitQuiz } = require('../controllers/quizController');

router.post('/submit-quiz', submitQuiz);

module.exports = router;
