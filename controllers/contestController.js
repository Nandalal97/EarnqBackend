// routes/Contest.js
const mongoose = require('mongoose');
const Contest = require('../models/ContestModel');
const ContestSubmission = require('../models/ContestSubmission');
const ContestQuestion = require('../models/ContestQuestion');
const Booking = require('../models/ContestBooking');
const ContestQuestionSet = require('../models/ContestQuestionSet');
const Winner = require('../models/winnerSchema');

const createContest = async (req, res) => {
  try {
    const {
      questionSetId,
      createdBy,
      title,
      subtitle,
      entryFee,
      prizeAmount,
      duration,       // in minutes
      startDate,      // 'YYYY-MM-DD'
      startClock,     // 'hh:mm'
      ampm,           // 'AM' or 'PM'
      language
    } = req.body;

    // ✅ Validate required fields
    if (!questionSetId || !title || !startDate || !startClock || !duration) {
      return res.status(400).json({ status: 0, msg: 'Missing required fields.' });
    }

    // ✅ Convert 12-hour clock to 24-hour
    let [hours, minutes] = startClock.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // ✅ Combine date and time, apply IST offset (+05:30)
    const startTime = new Date(`${startDate}T${formattedTime}:00+05:30`);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    console.log(startTime);
    

    // ✅ Optional: Log for debugging
    console.log("IST Start:", startTime.toString());
    console.log("UTC Stored Start:", startTime.toISOString());

    // ✅ Create new contest object
    const newContest = new Contest({
      questionSetId,
      createdBy: createdBy || '',  // ✅ Preserved your logic
      title,
      subtitle,
      entryFee,
      prizeAmount,
      duration,
      startTime,
      endTime,
      language
    });

    await newContest.save();

    res.status(201).json({
      status: 1,
      msg: "Exam Group Create Successfull",
      Data: newContest
    });

  } catch (err) {
    console.error('Exam group creation failed:', err);
    res.status(500).json({
      status: 0,
      msg: 'Failed to create contest',
      error: err.message || err
    });
  }
};

const getAllContests = async (req, res) => {
  try {
    const contests = await Contest.find({ status: "active" }).sort({ createdAt: -1 });

    // Loop through contests and count questions for each
    const results = await Promise.all(
      contests.map(async (contest) => {
        const questionCount = await ContestQuestion.countDocuments({ questionSetId: contest.questionSetId });

        let questionSetTitle = '';
        const questionSet = await ContestQuestionSet.findById(contest.questionSetId);
        if (questionSet) {
          questionSetTitle = questionSet.title;
        }

        return {
          ...contest._doc,
          totalQuestions: questionCount,
          questionSetTitle,
        };
      })
    );

    res.status(200).json({ status: 1, msg: "All Contest ", data: results });
  } catch (err) {
    console.error("Failed to fetch contests:", err);
    res.status(500).json({ error: "Failed to fetch exam groups" });
  }
};
const getAllContestsList = async (req, res) => {
  try {
    const contests = await Contest.find().sort({ createdAt: -1 });

    // Loop through contests and count questions for each
    const results = await Promise.all(
      contests.map(async (contest) => {
        const questionCount = await ContestQuestion.countDocuments({ questionSetId: contest.questionSetId });

        let questionSetTitle = '';
        const questionSet = await ContestQuestionSet.findById(contest.questionSetId);
        if (questionSet) {
          questionSetTitle = questionSet.title;
        }

        return {
          ...contest._doc,
          totalQuestions: questionCount,
          questionSetTitle,
        };
      })
    );

    res.status(200).json({ status: 1, msg: "All Contest ", data: results });
  } catch (err) {
    console.error("Failed to fetch contests:", err);
    res.status(500).json({ error: "Failed to fetch exam groups" });
  }
};
// Update contest
const singleContest = async (req, res) => {
  const { id } = req.params;

  try {
    const singleContest = await Contest.findByIdAndUpdate(id);

    if (!singleContest) {
      return res.status(404).json({ success: false, msg: 'Contest not found' });
    }

    res.status(200).json({
      success: true,
      msg: 'Contest updated successfully',
      data: singleContest,
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
};
// Update contest
const updateContest = async (req, res) => {
  const { id } = req.params;
  const {
    questionSetId,
    title,
    subtitle,
    entryFee,
    prizeAmount,
    duration,
    startDate,     // '2025-06-30'
    startClock,    // '10:30'
    ampm,          // 'AM' or 'PM'
    language,
    status
  } = req.body;

  try {
    // Validate time parts
    let [hours, minutes] = startClock.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    const startTime = new Date(`${startDate}T${formattedTime}:00+05:30`);
    const endTime = new Date(startTime.getTime() + duration * 60000);


    // Update contest
    const updatedContest = await Contest.findByIdAndUpdate(id, {
      questionSetId,
      title,
      subtitle,
      entryFee,
      prizeAmount,
      duration,
      startTime,
      endTime,
      language,
      status
    }, { new: true });

    if (!updatedContest) {
      return res.status(404).json({ success: false, msg: 'Contest not found' });
    }

    res.status(200).json({
      success: true,
      msg: 'Contest updated successfully',
      data: updatedContest,
    });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, msg: 'Server Error' });
  }
};
const deleteContest = async (req, res) => {
  try {
    const contest = await Contest.findByIdAndDelete(req.params.id);
    if (!contest) {
      return res.status(404).json({ success: false, message: 'Contest not found' });
    }
    res.json({ success: true, message: 'Contest deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// const submitContest = async (req, res) => {
//   const { userId, contestId, totalAnswer, correct, wrong, skipped, score, answers } = req.body;

//   try {
//     const exists = await ContestSubmission.findOne({ userId, contestId });
//     if (exists) {
//       return res.status(400).json({ success: false, message: 'Already submitted' });
//     }

//     const newSubmission = await ContestSubmission.create({
//       userId,
//       contestId,
//       totalAnswer,
//       correct,
//       wrong,
//       skipped,
//       score,
//       answers,
//       isSubmit: true,
//       submittedAt: new Date()
//     });

//     res.status(200).json({ success: true, data: newSubmission });
//   } catch (err) {
//     console.error('Submission error:', err);
//     res.status(500).json({ success: false, message: 'Internal server error' });
//   }
// };

const submitContest = async (req, res) => {
  const { userId, contestId, totalAnswer, correct, wrong, skipped, score, answers } = req.body;

  try {
    // ⚡ Atomic upsert: only insert if not exists
    const submission = await ContestSubmission.findOneAndUpdate(
      { userId, contestId }, // filter
      {
        $setOnInsert: {
          totalAnswer,
          correct,
          wrong,
          skipped,
          score,
          answers,
          isSubmit: true,
          submittedAt: new Date(),
        },
      },
      { upsert: true, new: true } // insert if not exists, return the document
    ).lean(); // lean returns a plain JS object

    // Check if the submission already existed
    const existedBefore = await ContestSubmission.exists({ userId, contestId, _id: { $ne: submission._id } });

    if (existedBefore) {
      // If another submission exists, reject
      return res.status(400).json({
        success: false,
        message: 'Already submitted',
        data: submission,
      });
    }

    // Successfully inserted
    res.status(200).json({
      success: true,
      message: 'Submission successful',
      data: submission,
    });

  } catch (err) {
    console.error('Submission error:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};



const getSubmitAnswer = async (req, res) => {
  const { contestId, userId } = req.query;

  if (!userId || !contestId) {
    return res.status(400).json({ success: false, message: 'userId and contestId are required' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(contestId)) {
    return res.status(400).json({ success: false, message: 'Invalid userId or contestId format' });
  }

  try {
    const submission = await ContestSubmission.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      contestId: new mongoose.Types.ObjectId(contestId),
    });

    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    console.error('getUserContestData error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get scoreboard by contestId
const getScoreboardByContestId = async (req, res) => {
  const { contestId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  if (!contestId) {
    return res.status(400).json({ success: false, message: 'contestId is required' });
  }

  try {
    // Total submissions (for pagination)
    const total = await ContestSubmission.countDocuments({ contestId, isSubmit: true });

    // Paginated scoreboard
    const scoreboard = await ContestSubmission.find({ contestId, isSubmit: true })
      .populate('userId', 'first_name middle_name last_name phone_number email')
      .sort({ score: -1 })
      .skip(skip)
      .limit(limit);

    // Build result with full name and rank
    const result = scoreboard.map((entry, index) => {
      const user = entry.userId;
      const fullName = `${user?.first_name || ''} ${user?.middle_name || ''} ${user?.last_name || ''}`
        .replace(/\s+/g, ' ')
        .trim();

      return {
        rank: skip + index + 1, // Rank should be global, not page-local
        name: fullName,
        phone: user?.phone_number || '',
        email: user?.email || '',
        score: entry.score,
        correct: entry.correct,
        wrong: entry.wrong,
        skipped: entry.skipped,
        totalAnswered: entry.totalAnswer,
        userId: user?._id || null,
      };
    });

    res.status(200).json({ success: true, data: result, total });

  } catch (error) {
    console.error('Scoreboard fetch error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// for admin dashbord
const getUpcomingContestsSummary = async (req, res) => {
  try {
    const now = new Date();

    // Fetch next 5 contests sorted by startTime
    const contests = await Contest.find({ status: 'active' }) // only active contests
      .sort({ startTime: 1 })
      .limit(10)
      .select('title startTime endTime duration');

    // Filter out invalid contests with missing/invalid dates
    const validContests = contests.filter(contest => {
      return contest.startTime && contest.endTime && !isNaN(new Date(contest.startTime)) && !isNaN(new Date(contest.endTime));
    });

    // Get bookings for these contests
    const contestIds = validContests.map(c => c._id);
    const bookings = await Booking.aggregate([
      { $match: { contestId: { $in: contestIds } } },
      { $group: { _id: "$contestId", totalBookings: { $sum: 1 } } }
    ]);

    const bookingsMap = {};
    bookings.forEach(b => {
      bookingsMap[b._id.toString()] = b.totalBookings;
    });

    // Final response formatting
    const data = validContests.map(contest => {
      const start = new Date(contest.startTime);
      const end = new Date(contest.endTime);

      let status = "Upcoming";
      if (now >= start && now <= end) status = "Running";
      else if (now > end) status = "Completed";

      return {
        id: contest._id,
        title: contest.title,
        startTime: contest.startTime,
        duration: contest.duration,
        totalBookings: bookingsMap[contest._id.toString()] || 0,
        status,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error fetching upcoming contests:", err.message);
    res.status(500).json({ success: false, message: "Server Error", error: err.message });
  }
};


const userContestBooking = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await Booking.find({
      userId,
      paymentStatus: { $regex: /^success$/i }
    })
      .populate("contestId", "title startTime language status attemptOnce")
      .exec();

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ message: "No successful bookings found" });
    }

    const response = bookings.map((booking) => ({
      contestId: booking.contestId._id,
      title: booking.contestId.title,
      startTime: booking.contestId.startTime,
      language: booking.contestId.language,
      status: booking.contestId.status,
      attemptOnce: booking.contestId.attemptOnce,
    }));

    res.json(response);
  } catch (error) {
    console.error("Error fetching booked contests:", error);
    res.status(500).json({ message: "Server error", error });
  }
};


const leaderBoard = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.query.userId; // frontend must send logged-in userId
    const limit = 10;
    // --- Get top 10 scorers ---
    const submissions = await ContestSubmission.find({ contestId })
      .populate("userId", "first_name last_name")
      .sort({ score: -1, timeTaken: 1, submittedAt: 1 });

    // Assign ranks globally
    const rankedSubmissions = submissions.map((sub, idx) => ({
      userId: sub.userId._id,
      name: `${sub.userId.first_name} ${sub.userId.last_name}`,
      score: sub.score,
      correct: sub.correct,
      wrong: sub.wrong,
      skipped: sub.skipped,
      rank: idx + 1,
    }));

    // Top 10 scorers
    const topScorer = rankedSubmissions.slice(0, limit);
    // Current user data
    const currentUserData = rankedSubmissions.find((s) => s.userId.toString() === userId) || null;
    // --- Winners Data ---
    const winners = await Winner.find({ contestId })
      .populate("userId", "first_name last_name")
      .sort({ rank: 1 });
    const winnerData = winners.map((w) => ({
      userId: w.userId._id,
      first_name: w.userId.first_name,
      last_name: w.userId.last_name,
      score: w.score,
      rank: w.rank,
      prizeAmount: w.prizeAmount,
    }));

    return res.status(200).json({
      success: true,
      contestId,
      topScorer,
      currentUserData,
      winners: winnerData,
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
  createContest,
  singleContest,
  updateContest,
  deleteContest,
  getAllContests,
  submitContest,
  getSubmitAnswer,
  getScoreboardByContestId,
  getUpcomingContestsSummary,
  userContestBooking,
  leaderBoard,
  getAllContestsList
}
