const express = require('express');

const { createPayment, updatePaymentStatus } = require('../controllers/talentpayment');
const { fetchQuestions, submitExam } = require('../controllers/TalentExamController');
const { getLeaderboard } = require('../controllers/talentLeaderboardController');
const {addTalentQuestion,getTalentQuestions,updateTalentQuestion,deleteTalentQuestion, talentRegisterStudent,createTalentContest, getAllTalentContests, getSlotCount, editTalentContest, getTalentContestById, deleteTalentContest, getTalentContestAnalytics, getTalentTopScorers, getSingleTalentQuestion } = require('../controllers/talentAdminController');
const router = express.Router();

// Add question (POST)
router.post('/questions/add', addTalentQuestion);
// Get questions (GET) by contest + slot + language
router.get('/questions/:contestId/:slotId/:lang', getTalentQuestions);

// GET /admin/talent/question/signle/:id
router.get('/questions/single/:id', getSingleTalentQuestion);
// PUT /api/admin/talent/questions/edit/:id
router.put("/questions/edit/:id", updateTalentQuestion);
// DELETE /api/admin/talent/questions/delete/:id
router.delete("/questions/delete/:id", deleteTalentQuestion);

// POST /api/admin/talent/contest/create
router.post('/contest/create', createTalentContest);
// GET /api/admin/talent/contest/all
router.get('/contest/all', getAllTalentContests);
// GET /api/admin/talent/contest/:id
router.get('/contest/:id', getTalentContestById);
// GET /api/admin/talent/contest/edit/:id
router.put('/contest/edit/:id', editTalentContest);
// GET /api/admin/talent/contest/delete/:id
router.delete('/contest/delete/:id', deleteTalentContest);
// GET /api/admin/talent/contest/analytics/:id
router.get('/contest/analytics/:id', getTalentContestAnalytics);
// GET /api/admin/talent/contest/:id/scorers
router.get('/contest/:id/scorers', getTalentTopScorers);



// slot count
// router.get('/contest/:contestId/slot-count', getSlotCount);
// // POST /api/talent/register
// router.post('/register', talentRegisterStudent);
// // POST /api/payment/create
// router.post('/payment/create', createPayment);
// // POST /api/payment/update
// router.post('/payment/update', updatePaymentStatus);
// // get/ talent exam questions
// router.get('/questions/fetch/:bookingId/:lang', fetchQuestions);
// // POST submit exam
// router.post('/exam/submit', submitExam);
// // GET leaderboard: contestId, slotId, top N (optional)
// router.get('/leaderboard/:contestId/:slotId', getLeaderboard);

module.exports = router;
