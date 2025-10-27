const TalentBooking = require('../models/TalentBooking');
const TalentQuestion = require('../models/TalentQuestion');
const TalentAnswer = require('../models/TalentAnswer');
const TalentPayment = require('../models/TalentPayments');
const moment = require("moment-timezone");
const mongoose = require("mongoose");
// check
const checkTalentExamEligibility = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId)
      return res.status(400).json({ status: "error", message: "User ID is required." });

    // 1️⃣ Find booking
    const booking = await TalentBooking.findOne({ userId }).lean();
    if (!booking)
      return res.status(404).json({ status: "not_ok", message: "No booking found for this user." });

    // 2️⃣ Find payment
    const payment = await TalentPayment.findOne({ bookingId: booking._id, status: "paid" }).lean();
    if (!payment)
      return res.status(403).json({ status: "not_ok", message: "Payment not found or not completed." });

    // 3️⃣ Slot timings (no change)
    const slotTimings = {
      "Slot-1": { start: "08:00 AM", end: "09:00 AM" },
      "Slot-2": { start: "08:00 PM", end: "11:30 PM" },
      "Slot-3": { start: "03:00 PM", end: "04:00 PM" },
      "Slot-4": { start: "05:00 PM", end: "06:00 PM" },
      "Slot-5": { start: "07:00 PM", end: "08:00 PM" },
      "Slot-6": { start: "09:00 PM", end: "10:00 PM" },
    };

    const slotInfo = slotTimings[booking.slotId];
    if (!slotInfo)
      return res.status(400).json({ status: 'not_ok', message: 'Invalid slot information.' });

    // ✅ 4️⃣ Exam Date Check
    if (!booking.examDate)
      return res.status(400).json({ status: 'not_ok', message: 'Exam date not found in your booking.' });

    const examDate = moment(booking.examDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
    const todayDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

  
//    const examDate = moment(booking.examDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
// const todayDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

if (examDate < todayDate) {
  return res.json({
    status: "not_ok",
    message: `❌ Your booked exam date (${examDate}) has already passed.`,
    startTime: slotInfo.start,
    endTime: slotInfo.end,
    slotId: booking.slotId,
  });
}

    if (examDate !== todayDate) {
      return res.json({
        status: "not_ok",
        message: `📅 Your booked exam date is ${examDate}. You can join only on that date.`,
        slotId: booking.slotId,
        startTime: slotInfo.start,
        endTime: slotInfo.end,
      });
    }

    // 5️⃣ Normal logic continues (same as before)
    const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const slotStartMoment = moment.tz(`${today} ${slotInfo.start}`, "YYYY-MM-DD hh:mm A", "Asia/Kolkata");
    const slotEndMoment = moment.tz(`${today} ${slotInfo.end}`, "YYYY-MM-DD hh:mm A", "Asia/Kolkata");

    const earlyEntry = slotStartMoment.clone().subtract(10, "minutes");
    const now = moment().tz("Asia/Kolkata");

    if (now.isAfter(slotEndMoment)) {
      return res.json({
        status: "not_ok",
        message: `❌ You missed your exam slot (${slotInfo.start} – ${slotInfo.end}).`,
        startTime: slotInfo.start,
        endTime: slotInfo.end,
        slotId: booking.slotId,
      });
    }

    if (now.isBefore(earlyEntry)) {
      const diffSeconds = slotStartMoment.diff(now, "seconds");
      return res.json({
        status: "not_ok",
        message: `⏳ Your slot starts at ${slotInfo.start}. You can join 10 minutes before.`,
        startTime: slotInfo.start,
        endTime: slotInfo.end,
        slotId: booking.slotId,
        bookingId: booking._id,
        canStartIn: diffSeconds,
      });
    }

    if (now.isBetween(earlyEntry, slotEndMoment)) {
      const diffSeconds = Math.max(slotStartMoment.diff(now, "seconds"), 0);
      return res.json({
        status: "ok",
        message: "⏰ Your exam will start soon.",
        startTime: slotInfo.start,
        endTime: slotInfo.end,
        canStartIn: diffSeconds,
        slotId: booking.slotId,
        bookingId: booking._id,
      });
    }

    return res.json({
      status: "ok",
      message: "User is eligible to start the exam.",
      data: {
        bookingId: booking._id,
        contestId: booking.contestId,
        slotId: booking.slotId,
        startTime: slotInfo.start,
        endTime: slotInfo.end,
        paymentId: payment._id,
        paidAt: payment.paidAt,
        canStartIn: 0,
      },
    });

  } catch (error) {
    console.error("Eligibility check error:", error);
    return res.status(500).json({ status: "error", message: "Server error." });
  }
};

// Fetch questions for student

// 🧠 In-memory cache: key = contestId_slotId, value = { lang: questions[] }
const questionCache = new Map();

// 🕒 Cache helper with expiry (default 75 min)
const setCacheWithExpiry = (key, data, ttlMs = 75 * 60 * 1000) => {
  questionCache.set(key, data);
  const timer = setTimeout(() => questionCache.delete(key), ttlMs);
  if (timer.unref) timer.unref();
};

// 🧹 Auto-clear cache when DB changes
const talentQuestionChangeStream = TalentQuestion.watch();
talentQuestionChangeStream.on("change", (change) => {
  const { operationType, fullDocument, updateDescription } = change;

  if (operationType === "delete") {
    console.log("TalentQuestion deleted → clearing all cache");
    questionCache.clear();
    return;
  }

  let contestId, slotId;

  if (["insert", "replace"].includes(operationType)) {
    contestId = fullDocument?.contestId?.toString();
    slotId = fullDocument?.slotId?.toString();
  } else if (operationType === "update") {
    contestId = updateDescription?.updatedFields?.contestId?.toString();
    slotId = updateDescription?.updatedFields?.slotId?.toString();
  }

  if (contestId && slotId) {
    const key = `${contestId}_${slotId}`;
    if (questionCache.has(key)) {
      questionCache.delete(key);
      console.log(`🧹 Cache cleared for key: ${key} due to DB change`);
    }
  }
});

// 🚀 Controller: Get Talent Questions (multi-language aware & cached)
const getTalentQuestions = async (req, res) => {
  try {
    const {
      contestId,
      slotId,
      lang = "en",
      page = 1,
      limit = 50,
    } = req.query;

    if (!contestId || !slotId)
      return res.status(400).json({ success: false, message: "contestId and slotId are required" });

    if (!mongoose.Types.ObjectId.isValid(contestId))
      return res.status(400).json({ success: false, message: "Invalid contestId format" });

    const cacheKey = `${contestId}_${slotId}`;
    let slotCache = questionCache.get(cacheKey) || {};

    // ✅ Check if requested language already cached
    if (!slotCache[lang]) {
      console.log(`⚙️ Cache miss for language ${lang} → Fetching from DB`);

      const allQuestions = await TalentQuestion.find({
        contestId,
        slotId: { $regex: `^${slotId}$`, $options: "i" }
      })
      .lean();

      if (!allQuestions.length)
        return res.status(404).json({ success: false, message: "No questions found" });

      // Store all languages for this slot in cache
      const langData = allQuestions.map(q => ({
        _id: q._id,
        contestId: q.contestId,
        slotId: q.slotId,
        questionText: q.questionText?.[lang] || q.questionText?.en || "",
        options: q.options.map(opt => ({
          optionText: opt.optionText?.[lang] || opt.optionText?.en || "",
          isCorrect: opt.isCorrect,
        })),
        questionType: q.questionType,
        marks: q.marks,
      }));

      slotCache[lang] = langData;
      setCacheWithExpiry(cacheKey, slotCache);
    } else {
      console.log(`✅ Cache hit for language ${lang}`);
    }

    // Pagination
    const data = slotCache[lang];
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(Math.max(1, parseInt(limit)), 200);
    const totalQuestions = data.length;
    const totalPages = Math.ceil(totalQuestions / pageSize);

    const startIndex = (pageNum - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedQuestions = data.slice(startIndex, endIndex);

    return res.json({
      success: true,
      fromCache: questionCache.has(cacheKey),
      totalQuestions,
      totalPages,
      page: pageNum,
      pageSize,
      questions: paginatedQuestions,
    });

  } catch (error) {
    console.error("❌ Error fetching talent questions:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


// Submit exam
// const submitExam = async (req, res) => {
//   try {
//     const { bookingId, answers } = req.body;

//     const booking = await TalentBooking.findById(bookingId);
//     if (!booking) return res.status(404).json({ message: 'Booking not found' });
//     if (booking.examTaken) return res.status(400).json({ message: 'Exam already submitted' });

//     const questionIds = answers.map(a => a.questionId);
//     const questions = await TalentQuestion.find({ _id: { $in: questionIds } });

//     let totalScore = 0, attemptedCount = 0, skippedCount = 0, correctCount = 0, wrongCount = 0;

//     const answerRecords = answers.map(a => {
//       const q = questions.find(qq => qq._id.toString() === a.questionId);
//       if (!q) return null;

//       let correct = false;
//       let skipped = false;

//       if (q.questionType === 'mcq') {
//         if (a.selectedOptionIndex === null || a.selectedOptionIndex === undefined) {
//           skipped = true;
//           skippedCount++;
//         } else {
//           attemptedCount++;
//           correct = q.options[a.selectedOptionIndex]?.isCorrect || false;
//           if (correct) correctCount++;
//           else {
//             wrongCount++;
//             totalScore -= 0.33; // negative marking
//           }
//         }
//       } else if (q.questionType === 'text' || q.questionType === 'numeric') {
//         if (!a.textAnswer) {
//           skipped = true;
//           skippedCount++;
//         } else {
//           attemptedCount++;
//           correct = a.textAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
//           if (correct) correctCount++;
//           else {
//             wrongCount++;
//             totalScore -= 0.33;
//           }
//         }
//       }

//       if (correct) totalScore += q.marks;

//       return {
//         questionId: a.questionId,
//         selectedOptionIndex: a.selectedOptionIndex || null,
//         textAnswer: a.textAnswer || null,
//         isCorrect: correct,
//         skipped
//       };
//     }).filter(a => a !== null);

//     // Save answers
//     const talentAnswer = await TalentAnswer.create({
//       bookingId,
//       contestId: booking.contestId,
//       slotId: booking.slotId,
//       answers: answerRecords,
//       totalScore,
//       attemptedCount,
//       skippedCount,
//       correctCount,
//       wrongCount
//     });

//     // Update booking
//     booking.examTaken = true;
//     booking.examTakenAt = new Date();
//     booking.score = totalScore;
//     await booking.save();

//     res.json({
//       message: 'Exam submitted',
//       totalScore,
//       attemptedCount,
//       skippedCount,
//       correctCount,
//       wrongCount
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };

const submitExam = async (req, res) => {
  try {
    const { bookingId, answers } = req.body;

    if (!bookingId || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ message: "Invalid input data" });
    }

    // 1️⃣ Validate Booking
    const booking = await TalentBooking.findById(bookingId);
    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    if (booking.examTaken)
      return res.status(400).json({ message: "Exam already submitted" });

    // 2️⃣ Fetch All Questions (by IDs from answers)
    const questionIds = answers.map((a) => a.questionId);
    const questions = await TalentQuestion.find({ _id: { $in: questionIds } }).lean();

    if (!questions.length)
      return res.status(404).json({ message: "No questions found" });

    // 3️⃣ Initialize counters
    let totalScore = 0,
      attemptedCount = 0,
      skippedCount = 0,
      correctCount = 0,
      wrongCount = 0;

    // 4️⃣ Map through answers
    const answerRecords = answers
      .map((a) => {
        const q = questions.find((qq) => qq._id.toString() === a.questionId);
        if (!q) return null;

        let correct = false;
        let skipped = false;

        if (q.questionType === "mcq") {
          // Multiple Choice
          if (a.selectedOptionIndex === null || a.selectedOptionIndex === undefined) {
            skipped = true;
            skippedCount++;
          } else {
            attemptedCount++;
            correct = q.options[a.selectedOptionIndex]?.isCorrect || false;
            if (correct) {
              correctCount++;
              totalScore += q.marks;
            } else {
              wrongCount++;
              totalScore -= 0.33; // Negative marking
            }
          }
        } else if (["text", "numeric"].includes(q.questionType)) {
          // Text/Numeric Question
          if (!a.textAnswer || a.textAnswer.trim() === "") {
            skipped = true;
            skippedCount++;
          } else {
            attemptedCount++;
            const userAnswer = a.textAnswer.trim().toLowerCase();
            const correctAnswer = (q.correctAnswer || "").trim().toLowerCase();
            correct = userAnswer === correctAnswer;
            if (correct) {
              correctCount++;
              totalScore += q.marks;
            } else {
              wrongCount++;
              totalScore -= 0.33;
            }
          }
        }

        return {
          questionId: q._id,
          selectedOptionIndex:
            a.selectedOptionIndex !== undefined ? a.selectedOptionIndex : null,
          textAnswer: a.textAnswer || null,
          isCorrect: correct,
          skipped,
        };
      })
      .filter((a) => a !== null);

    // 5️⃣ Save answers in TalentAnswer collection
    const talentAnswer = await TalentAnswer.create({
      bookingId,
      contestId: booking.contestId,
      slotId: booking.slotId,
      answers: answerRecords,
      totalScore,
      attemptedCount,
      skippedCount,
      correctCount,
      wrongCount,
    });

    // 6️⃣ Update booking info safely
    booking.examTaken = true;
    booking.examTakenAt = new Date();
    booking.score = totalScore;
    await booking.save();

    // 7️⃣ Return result
    return res.json({
      success: true,
      message: "Exam submitted successfully",
      // totalScore,
      attemptedCount,
      skippedCount,
      // correctCount,
      // wrongCount,
    });
  } catch (error) {
    console.error("❌ Error submitting exam:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

const checkExamTaken= async (req, res) => {
  try {
    const { bookingId } = req.query;

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "bookingId is required" });
    }

    // Find booking
    const booking = await TalentBooking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Check examTaken flag
    if (booking.examTaken) {
      return res.json({
        success: true,
        examTaken: true,
        examTakenAt: booking.examTakenAt,
        message: "User has already taken the exam.",
      });
    }

    return res.json({
      success: true,
      examTaken: false,
      message: "User has not taken the exam yet.",
    });
  } catch (err) {
    console.error("❌ Error checking exam status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



module.exports = {
  // fetchQuestions,
  submitExam,
  checkTalentExamEligibility,
  getTalentQuestions,
  checkExamTaken
}