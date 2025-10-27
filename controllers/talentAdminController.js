const moment = require("moment-timezone");
const TalentBooking = require('../models/TalentBooking');
const TalentContest = require('../models/TalentContest');
const TalentAnswer = require("../models/TalentAnswer");
const TalentQuestion = require('../models/TalentQuestion');
const mongoose = require("mongoose");
// Create new contest
const createTalentContest = async (req, res) => {
  try {
    const { title, description, startDate, endDate, entryFee, maxParticipantsPerSlot, totalSlots, duration, createdBy } = req.body;

    const startDateIST = startDate.includes("T") 
      ? moment.tz(startDate, "Asia/Kolkata") 
      : moment.tz(`${startDate} 00:00:00`, "Asia/Kolkata");

    let endDateIST;
    if (endDate) {
      endDateIST = endDate.includes("T") 
        ? moment.tz(endDate, "Asia/Kolkata") 
        : moment.tz(`${endDate} 23:59:59`, "Asia/Kolkata");
    } else {
      endDateIST = moment.tz(`${startDate} 23:59:59`, "Asia/Kolkata");
    }

    const contest = await TalentContest.create({
      title,
      description,
      startDate: startDateIST.toDate(),
      endDate: endDateIST.toDate(),
      entryFee,
      maxParticipantsPerSlot,
      totalSlots,
      duration,
      createdBy
    });

    res.status(201).json({ status: 1, message: 'Contest created' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 0, message: 'Server error' });
  }
};

// Edit Talent Contest
const editTalentContest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      startDate,
      endDate,
      entryFee,
      maxParticipantsPerSlot,
      totalSlots,
      duration,
      isActive,
      createdBy
    } = req.body;

    if (!startDate) {
      return res.status(400).json({ message: "startDate is required" });
    }

    // handle start date
    const startDateIST = startDate.includes("T") 
      ? moment.tz(startDate, "Asia/Kolkata") 
      : moment.tz(`${startDate} 00:00:00`, "Asia/Kolkata");

    // handle end date
    let endDateIST;
    if (endDate) {
      endDateIST = endDate.includes("T") 
        ? moment.tz(endDate, "Asia/Kolkata") 
        : moment.tz(`${endDate} 23:59:59`, "Asia/Kolkata");
    } else {
      endDateIST = moment.tz(`${startDate} 23:59:59`, "Asia/Kolkata");
    }

    // Update contest
    const updatedContest = await TalentContest.findByIdAndUpdate(
      id,
      {
        title,
        description,
        startDate: startDateIST.toDate(),
        endDate: endDateIST.toDate(),
        entryFee,
        maxParticipantsPerSlot,
        totalSlots,
        duration,
        isActive,
        createdBy,
      },
      { new: true, runValidators: true }
    );

    if (!updatedContest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    res.status(200).json({ message: "Contest updated successfully", contest: updatedContest });
  } catch (error) {
    console.error("Error updating contest:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get a single Talent Contest by ID
const getTalentContestById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Find contest by ID
    const contest = await TalentContest.findById(id);

    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    res.status(200).json({ contest });
  } catch (error) {
    console.error("Error fetching contest:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /admin/talent/contest/:id
const deleteTalentContest = async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ Find contest by ID
    const contest = await TalentContest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    // ✅ Delete contest
    await TalentContest.findByIdAndDelete(id);
    res.status(200).json({ message: "Contest deleted successfully" });
  } catch (error) {
    console.error("Error deleting contest:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get all contests
const getAllTalentContests = async (req, res) => {
  try {
    // 1️⃣ Get all active contests
    const contests = await TalentContest.find().sort({ startDate: -1 });

    if (contests.length === 0) {
      return res.status(404).json({ status: 1, message: 'No Contest Found' });
    }

    // 2️⃣ Get total questions grouped by contestId
    const questionCounts = await TalentQuestion.aggregate([
      { $group: { _id: "$contestId", totalQuestions: { $sum: 1 } } }
    ]);

    // 3️⃣ Create a quick lookup map
    const countMap = {};
    questionCounts.forEach(q => {
      countMap[q._id.toString()] = q.totalQuestions;
    });

    // 4️⃣ Add totalQuestions to each contest
    const contestsWithCounts = contests.map(contest => ({
      ...contest.toObject(),
      totalQuestions: countMap[contest._id.toString()] || 0
    }));

    // 5️⃣ Return result
    return res.json({ contests: contestsWithCounts });

  } catch (error) {
    console.error("Error fetching contests:", error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// GET /admin/talent/contest/:id/analytics
const getTalentContestAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    // ✅ Fetch contest info
    const contest = await TalentContest.findById(id);
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }
    // ✅ Fetch all bookings for the contest
    const bookings = await TalentBooking.find({ contestId: id });
    // Default values if no bookings
    if (!bookings || bookings.length === 0) {
      return res.status(200).json({
        analytics: {
          contestTitle: contest.title || "",
          startDate: contest.startDate || null,
          endDate: contest.endDate || null,
          totalBookings: 0,
          totalSlots: 0,
          bookingsPerSlot: [],
          genderDistribution: { male: 0, female: 0, other: 0 },
          examTakenCount: 0,
          averageScore: 0,
          highestScore: 0,
          lowestScore: 0,
          liveExamCount: 0,
        },
      });
    }

    // ✅ Total bookings
    const totalBookings = bookings.length;

    // ✅ Distinct slots
    const slots = [...new Set(bookings.map((b) => b.slotId))];
    const totalSlots = slots.length;

    // ✅ Bookings per slot
    const bookingsPerSlot = slots.map((slot) => ({
      slotId: slot,
      count: bookings.filter((b) => b.slotId === slot).length,
    }));

    // ✅ Gender distribution
    const maleCount = bookings.filter((b) => b.gender?.toLowerCase() === "male")
      .length;
    const femaleCount = bookings.filter((b) => b.gender?.toLowerCase() === "female")
      .length;
    const otherCount = totalBookings - maleCount - femaleCount;

    // ✅ Scores
   const scores = bookings.map((b) => b.score || 0);
const averageScore = Number((scores.reduce((a, b) => a + b, 0) / (scores.length || 1)).toFixed(2));
const highestScore = Math.max(...scores);
const lowestScore = Math.min(...scores);

    // ✅ Exam taken count
    const examTakenCount = bookings.filter((b) => b.examTaken).length;

    // ✅ Live exam count (current time between start and end of user's exam)
    const now = new Date();
    const liveExamCount = bookings.filter((b) => {
      if (!b.examTakenAt || !b.duration) return false;
      const examStart = new Date(b.examTakenAt);
      const examEnd = new Date(examStart.getTime() + b.duration * 60000);
      return now >= examStart && now <= examEnd;
    }).length;

    // ✅ Build analytics object
    const analytics = {
      contestTitle: contest.title,
      startDate: contest.startDate,
      endDate: contest.endDate,
      totalBookings: totalBookings || 0,
      totalSlots: totalSlots || 0,
      bookingsPerSlot: bookingsPerSlot.length > 0 ? bookingsPerSlot : [],
      genderDistribution: {
        male: maleCount || 0,
        female: femaleCount || 0,
        other: otherCount || 0,
      },
      examTakenCount: examTakenCount || 0,
      averageScore: averageScore || 0,
      highestScore: highestScore || 0,
      lowestScore: lowestScore || 0,
      liveExamCount: liveExamCount || 0,
    };

    res.status(200).json({ analytics });
  } catch (error) {
    console.error("Error fetching contest analytics:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /admin/talent/contest/:id/top-scorers
const getTalentTopScorers = async (req, res) => {
  try {
    const { id } = req.params; // contestId
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // cap 100 per page
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();

    // ✅ Validate contestId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid contestId" });
    }

    // ✅ Build search query
    const searchQuery = {
      contestId: id,
      examTaken: true,
    };
    if (search) {
      const regex = new RegExp(search, "i"); // case-insensitive
      searchQuery.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    // ✅ Count total participants with exam taken & search
    const totalCount = await TalentBooking.countDocuments(searchQuery);

    // ✅ Top 300 for rank mapping (ignore search for global rank)
    const top300 = await TalentBooking.find({
      contestId: id,
      examTaken: true,
    })
      .sort({ score: -1, examTakenAt: 1 })
      .limit(300)
      .select("_id score")
      .lean();

    const rankMap = {};
    let currentRank = 1;
    top300.forEach((b, idx) => {
      if (idx > 0 && b.score < top300[idx - 1].score) {
        currentRank = idx + 1;
      }
      rankMap[b._id.toString()] = currentRank;
    });

    // ✅ Paginated bookings with search applied
    const paginatedBookings = await TalentBooking.find(searchQuery)
      .sort({ score: -1, examTakenAt: 1 })
      .skip(skip)
      .limit(limit)
      .select("name email phone gender slotId score examTakenAt")
      .lean();

    // ✅ Answer stats
    const bookingIds = paginatedBookings.map((b) => b._id);
    const answers = await TalentAnswer.find({
      contestId: id,
      bookingId: { $in: bookingIds },
    })
      .select("bookingId attemptedCount skippedCount correctCount wrongCount slotId")
      .lean();

    const answerMap = {};
    answers.forEach((a) => {
      answerMap[a.bookingId.toString()] = a;
    });

    const topScorers = paginatedBookings.map((b, idx) => {
       const ans = answerMap[b._id.toString()] || {};
      const rank = rankMap[b._id.toString()] || skip + idx + 1;
      const winnerStatus = b.score >= 85 && rank <= 3 ? "winner" : "disqualify";
      return {
        rank: rank,
        name: b.name,
        email: b.email,
        phone: b.phone,
        gender: b.gender || "N/A",
        slot: b.slotId || "N/A",
        score: b.score || 0,
        totalAttempted: ans.attemptedCount || 0,
        totalSkipped: ans.skippedCount || 0,
        totalCorrect: ans.correctCount || 0,
        totalWrong: ans.wrongCount || 0,
        examTakenAt: b.examTakenAt || null,
        winner: winnerStatus,
      };
    });

    return res.status(200).json({
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      topScorers,
    });
  } catch (error) {
    console.error("Error fetching top scorers with details:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// GET /api/talent/contest/:contestId/slot-count
const getSlotCount = async (req, res) => {
  const { contestId } = req.params;
  try {
    // Define the slots
    const slots = ["Slot-1", "Slot-2", "Slot-3", "Slot-4"];
    // Count bookings for all slots in parallel
    const counts = await Promise.all(
      slots.map(slot =>
        TalentBooking.countDocuments({ contestId, slotId: slot })
      )
    );
    // Build slotCounts object
    const slotCounts = {};
    slots.forEach((slot, index) => {
      slotCounts[slot] = {
        count: counts[index],
        isFull: counts[index] >= 500   // flag full slot
      };
    });
    res.json({ slotCounts });
  } catch (err) {
    console.error("Error fetching slot counts:", err);
    res.status(500).json({ message: "Server error" });
  }
};
function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!%*?";
  const length = Math.floor(Math.random() * (16 - 8 + 1)) + 8; // random length 8–16
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
// Register student for a contest
const talentRegisterStudent = async (req, res) => {
  try {
    const { name, email, phone, gender, dob, contestId, slotId, referralCode } = req.body;

    // Check if already registered for the contest by email or phone
    const exists = await TalentBooking.findOne({
      contestId,
      $or: [{ email }, { phone }]
    });
    if (exists) return res.status(400).json({ status: 0, message: 'Already registered for this contest' });
    // ✅ Check how many users are already registered for this slot
    const currentCount = await TalentBooking.countDocuments({ contestId, slotId });
    if (currentCount >= 500) {
      return res.status(400).json({
        status: 0,
        message: "This slot is full. Please select another slot."
      });
    }
    // ✅ Generate auto password
    const password = generatePassword();
    // Create registration
    const booking = await TalentBooking.create({
      name,
      email,
      phone,
      gender,
      dob,
      contestId,
      slotId,
      password,
      referralCode: referralCode || null
    });

    res.status(201).json({
      status: 1,
      message: 'Registration successful'
      // booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 0, message: 'Server error' });
  }
};

// Add new question (multi-language)
const addTalentQuestion = async (req, res) => {
  try {
    const { contestId, slotId, questionText, options, questionType, marks } = req.body;

    const question = await TalentQuestion.create({
      contestId,
      slotId,
      questionText, // Map of language code
      options,      // Map of language code for options
      questionType,
      marks
    });

    res.status(201).json({ message: 'Question added', question });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get questions for a contest + slot + preferred language
const getTalentQuestions = async (req, res) => {
  try {
    const { contestId, slotId, lang = "en" } = req.params;
    // page & limit can come from query params, default 1 & 10
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    if (!contestId) {
      return res.status(400).json({ message: "contestId is required" });
    }

    const filter = { contestId };
    if (slotId) filter.slotId = slotId;

    const total = await TalentQuestion.countDocuments(filter);

   const questions = await TalentQuestion.find(filter)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();  // keep lean

    const localizedQuestions = questions.map((q) => ({
  _id: q._id,
  questionText: q.questionText?.[lang] || q.questionText?.en || "",
  questionType: q.questionType,
  marks: q.marks,
  slot:q.slotId,
  options: q.options.map((o) => ({
    optionText: o.optionText?.[lang] || o.optionText?.en || "",
    isCorrect: o.isCorrect
  }))
}));

    res.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      questions: localizedQuestions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET single questions
const getSingleTalentQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch question by ID
    const question = await TalentQuestion.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Return full question object (all languages)
    res.json({ question });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// update talent questions
const updateTalentQuestion = async (req, res) => {
  try {
    const { id } = req.params; // Question _id from URL

    const {
      contestId,
      slotId,
      questionText,   // { en: "", bn: "", hi: "" }
      questionType,   // "mcq" | "text" | "numeric"
      marks,          // number
      options         // [{ optionText:{en,bn,hi}, isCorrect }]
    } = req.body;

    // Build update object dynamically
    const updateFields = {};
    if (contestId) updateFields.contestId = contestId;
    if (slotId) updateFields.slotId = slotId;
    if (questionText) updateFields.questionText = questionText;
    if (questionType) updateFields.questionType = questionType;
    if (marks !== undefined) updateFields.marks = marks;
    if (options) updateFields.options = options;

    const updatedQuestion = await TalentQuestion.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true } // return updated doc
    ).lean(); // lean for faster response

    if (!updatedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json({
      message: "Question updated successfully",
      question: updatedQuestion
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// delete talent questions
const deleteTalentQuestion = async (req, res) => {
  try {
    const { id } = req.params; // Question _id from URL

    const deletedQuestion = await TalentQuestion.findByIdAndDelete(id);

    if (!deletedQuestion) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json({
      message: "Question deleted successfully",
      questionId: id
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createTalentContest,
  getTalentContestById,
  editTalentContest,
  deleteTalentContest,
  getAllTalentContests,
  getTalentContestAnalytics,
  getTalentTopScorers,
  addTalentQuestion,
  getTalentQuestions,
  getSingleTalentQuestion,
  updateTalentQuestion,
  deleteTalentQuestion,

  talentRegisterStudent,
  getSlotCount
}
