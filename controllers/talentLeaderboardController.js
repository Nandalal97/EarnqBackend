const mongoose = require('mongoose');
const TalentBooking = require('../models/TalentBooking');
const TalentAnswer = require('../models/TalentAnswer');

const getLeaderboard = async (req, res) => {
  try {
    const { contestId, slotId } = req.params;
    const top = parseInt(req.query.top) || 50;

    // Only fetch students who have submitted exam
    const bookings = await TalentBooking.find({
      contestId: new mongoose.Types.ObjectId(contestId),
      slotId,
      examTaken: true // only submitted exams
    })
    .sort({ score: -1, examTakenAt: 1 })
    .limit(top)
    .select('userId score examTaken examTakenAt');

    if (bookings.length === 0) {
      return res.json({ leaderboard: [] }); // exam not yet submitted
    }

    const bookingIds = bookings.map(b => b._id);
    const answers = await TalentAnswer.find({ bookingId: { $in: bookingIds } })
      .select('bookingId totalScore attemptedCount skippedCount correctCount wrongCount');

    const answerMap = {};
    answers.forEach(a => {
      answerMap[a.bookingId] = {
        totalScore: a.totalScore,
        attemptedCount: a.attemptedCount,
        skippedCount: a.skippedCount,
        correctCount: a.correctCount,
        wrongCount: a.wrongCount
      };
    });

    const leaderboard = bookings.map((b, index) => {
      const stats = answerMap[b._id] || {
        totalScore: 0,
        attemptedCount: 0,
        skippedCount: 0,
        correctCount: 0,
        wrongCount: 0
      };

      return {
        rank: index + 1,
        userId: b.userId,
        totalScore: stats.totalScore,
        attemptedCount: stats.attemptedCount,
        skippedCount: stats.skippedCount,
        correctCount: stats.correctCount,
        wrongCount: stats.wrongCount,
        examTaken: b.examTaken,
        submittedAt: b.examTakenAt
      };
    });

    res.json({ leaderboard });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getLeaderboard };
