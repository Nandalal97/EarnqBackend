// routes/Contest.js
const express = require('express');
const router = express.Router();

const { createContest, submitContest, deleteContest, updateContest, singleContest, getScoreboardByContestId, getUpcomingContestsSummary, getAllContests, getAllContestsList, getSubmitAnswer, userContestBooking, leaderBoard } = require('../controllers/contestController');
const { contestBookingOrder, bookingVerify,bookContest, getUserBookingStatus, markAttempted, getContestStats, getContestBookings } = require('../controllers/contestBooking');
const { addWinner, getAllWinners, getWinnersByContest, deleteWinner } = require('../controllers/winnerController');
const { CreateQuestionSet, GetAllQuestionSets,GetQuestionSetsForCreateContest, GetQuestionSetById, DeleteQuestionSet, UpdateQuestionSet } = require('../controllers/questionSet');
const { CreateQuestion, GetQuestionsBySet, GetQuestionById, UpdateQuestion, DeleteQuestion, getQuestionsForExams, contestQuestionsGenerated } = require('../controllers/contestQuestionController');

//contest
router.post('/create', createContest);
router.get('/all', getAllContests);
router.get('/allContext', getAllContestsList);
router.delete('/delete/:id', deleteContest);
router.put('/edit/:id', updateContest);
router.get('/single/:id', singleContest);
router.get('/userBookingContest/:userId', userContestBooking);

// contest submit
router.post('/submit', submitContest)
router.get('/userContestData', getSubmitAnswer);
router.get('/scoreboard/:contestId', getScoreboardByContestId);
router.get('/leaderboard/:contestId', leaderBoard);


// for admin dashbord
router.get('/admin/contests-summary', getUpcomingContestsSummary);

// contest questins set
router.post('/questionSet/create',  CreateQuestionSet);
router.get('/questionSet/all', GetAllQuestionSets);
router.get('/questionSet/allSet', GetQuestionSetsForCreateContest);
router.get('/questionSet/:id', GetQuestionSetById);
router.delete('/questionSet/delete/:id', DeleteQuestionSet);
router.put('/questionSet/update/:id', UpdateQuestionSet);


// Create a new question
router.post('/questionSet/question/generate', contestQuestionsGenerated);
router.post('/questionSet/question/create', CreateQuestion);
router.get('/questionSet/questions/:setId', GetQuestionsBySet);



router.get('/questionSet/question/:id', GetQuestionById);
router.put('/questionSet/question/update/:id', UpdateQuestion);
router.delete('/questionSet/question/delete/:id', DeleteQuestion);

// Questions for contex exmal fronend
router.get('/questionSet/:setId/questions', getQuestionsForExams);


// booking payment
router.post('/new-booking', contestBookingOrder )
router.post('/booking-verify', bookingVerify )
router.post('/booking', bookContest );
router.get('/user-booking-status', getUserBookingStatus)
router.post('/update-attempt', markAttempted);
router.get('/stats', getContestStats);
router.get('/:id/bookings', getContestBookings);

// contest winners
router.post('/winner/add', addWinner);
// Get all winners
router.get('/winner/all', getAllWinners);
// Get winners by contest
router.get('/winner/:contestId', getWinnersByContest);
// Delete winner
router.delete('/winner/:id',deleteWinner);




module.exports = router;
