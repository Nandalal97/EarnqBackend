const express = require('express');
const { talentRegisterStudent, getAllTalentContests, getSlotCount, updateRegisterPaymentStatus,deleteTalentBookingStudent } = require('../controllers/talentController');
const { createPayment,paymentData, updatePaymentStatus, paymentVerify } = require('../controllers/talentpayment');
const { fetchQuestions, submitExam, checkTalentExamEligibility, getTalentQuestions, checkExamTaken } = require('../controllers/TalentExamController');
const { getLeaderboard } = require('../controllers/talentLeaderboardController');
const router = express.Router();

// GET /api/contest/all
router.get('/contest/all', getAllTalentContests);
// slot count
router.get('/contest/:contestId/slot-count', getSlotCount);
// POST /api/talent/register
router.post('/register', talentRegisterStudent);
router.patch('/student/update', updateRegisterPaymentStatus);
router.delete('/student/delete/:bookingId', deleteTalentBookingStudent);

// POST /api/payment/create
router.post('/payment/create', createPayment);
router.post('/payment/verify', paymentVerify);
router.post('/payment', paymentData);

// POST /api/payment/update
router.post('/payment/update', updatePaymentStatus);

// GET /api/talent/eligibility/:userId
router.get('/eligibility/:userId', checkTalentExamEligibility);

// get/ talent exam questions
// router.get('/questions/fetch/:bookingId/:lang', fetchQuestions);

// GET /api/talent/questions?contestId=652fc45...&slotId=morning-slot&lang=bn&page=1&limit=10

router.get('/questions/', getTalentQuestions);

// POST submit exam
router.post('/exam/submit', submitExam);
router.get('/exam/check', checkExamTaken);

// GET leaderboard: contestId, slotId, top N (optional)
router.get('/leaderboard/:contestId/:slotId', getLeaderboard);

module.exports = router;

