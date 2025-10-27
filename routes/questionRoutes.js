const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { addQuestion, getSigleQuestion, getAllQuestions, getQuestionsByCategoryAndSubject,getQuestionsByCategoryAndSubjectForAdminPanel, updateQuestion, getSingleQuestion, deleteQuestion } = require('../controllers/questionController');
const verifyToken = require('../middleware/verifyToken');
const { verifyAdminToken } = require('../middleware/verifyAdmin');

// POST: Add a question
router.post('/add-question', addQuestion);
// get one qustions 
router.post('/get-question', getSigleQuestion);

// get all qustions
router.get('/',verifyToken, getAllQuestions);

// single questions
router.get('/single/:id', getSingleQuestion)


// delete Questions 
router.delete('/delete/:id', deleteQuestion)

// get question category and subject ways
router.get('/filter', getQuestionsByCategoryAndSubject)
router.get('/admin/filter', getQuestionsByCategoryAndSubjectForAdminPanel)

// update questions
router.patch('/update/:id', updateQuestion);



module.exports = router;
