const MockTest = require('../models/MockTest');
const MockTestQuestions = require("../models/MockTestQuestionSchema");
const UserMockTest = require("../models/MockTestResult");
const mongoose = require("mongoose");
const User = require("../models/User");
// add quetions
const addMockQuestion = async (req, res) => {
  try {
    const {
      questionText,   // { en: "", hi: "", bn: "" }
      options,        // [ { optionId: "A", text: { en: "", hi: "", bn: "" } }, ...]
      correctOption,  // "A" / "B" / "C" / "D"
      subjects,       // "Biology" etc.
      difficulty,     // "easy" | "medium" | "hard"
      tags            // ["plants","photosynthesis"]
    } = req.body;

    // Validation: questionText must have at least English
    if (!questionText?.en || !options || options.length < 2) {
      return res.status(400).json({ error: "Invalid question format" });
    }

    // Create & save
    const newQuestion = new MockTestQuestions({
      questionText,
      options,
      correctOption,
      subjects,
      difficulty,
      tags
    });

    await newQuestion.save();

    res.status(201).json({ message: "Question added successfully", question: newQuestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const getQuestions = async (req, res) => {
  try {
    // Query params
    const { subject, difficulty, tags, page = 1, limit = 50, lang = "en" } = req.query;
    // Build filter object
    const filter = {};
    if (subject) filter.subjects = subject;
    if (difficulty) filter.difficulty = difficulty;
    if (tags) filter.tags = { $in: Array.isArray(tags) ? tags : [tags] };
    // Pagination
    const pageSize = parseInt(limit);
    const skip = (parseInt(page) - 1) * pageSize;

    // Fetch questions
    const questions = await MockTestQuestions.find(filter)
      .skip(skip)
      .limit(pageSize)
      .lean()
      .exec();
    // Language-wise transformation
    const transformed = questions.map(q => ({
      questionText: q.questionText?.[lang] || q.questionText?.en || "",
      options: q.options.map(opt => ({
        optionId: opt.optionId,
        text: opt.text?.[lang] || opt.text?.en || ""
      })),
      correctOption: q.correctOption,
      subjects: q.subjects,
      difficulty: q.difficulty,
      tags: q.tags || []
    }));

    // Count total
    const total = await MockTestQuestions.countDocuments(filter);

    res.json({
      total,
      page: parseInt(page),
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      questions: transformed
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// mocktest set controllers
// create mocktest set
const createMockTest = async (req, res) => {
  try {
    const { title, subjects, difficulty, duration, isPremium,isActive, category, createdBy } = req.body;
    // Validation
    if (!title?.en || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: "Title in English and subjects are required" });
    }
    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "Category is required" });
    }

    let allQuestions = [];
    let remainingCount = 0;

    // First pass: select requested questions per subject
    for (const subj of subjects) {
      const { name, count } = subj;
      if (!name || !count || count <= 0) continue;

      const questions = await MockTestQuestions.aggregate([
        {
          $match: {
            subjects: { $in: [new RegExp(`^${name}$`, "i")] },
            ...(difficulty && { difficulty })
          }
        },
        { $sample: { size: count } }
      ]);

      // console.log(`Subject "${name}" selected ${questions.length} questions (requested ${count})`);
      if (questions.length < count) {
        remainingCount += count - questions.length;
        // console.warn(
        //   `Warning: Subject "${name}" requested ${count} questions but only ${questions.length} available`
        // );
      }

      allQuestions = allQuestions.concat(questions.map(q => q._id));
    }
    // Second pass: fill remaining questions from any subject if needed
    if (remainingCount > 0) {
      const otherQuestions = await MockTestQuestions.aggregate([
        {
          $match: {
            ...(difficulty && { difficulty }),
            _id: { $nin: allQuestions }
          }
        },
        { $sample: { size: remainingCount } }
      ]);

      // console.log(`Filling remaining ${remainingCount} questions with ${otherQuestions.length} available`);

      allQuestions = allQuestions.concat(otherQuestions.map(q => q._id));

      // if (otherQuestions.length < remainingCount) {
      //   console.warn(`Warning: Only ${otherQuestions.length} extra questions available to fill remaining ${remainingCount}`);
      // }
    }

    if (allQuestions.length === 0) {
      return res.status(400).json({ status:false, error: "No questions found for the given subjects/difficulty" });
    }

    // Create MockTest
    const mockTest = new MockTest({
      title,
      subjects: subjects.map(s => s.name),
      category,           // <-- new category field
      questions: allQuestions,
      duration: duration || 30,
      isPremium: isPremium || false,
      isActive: isActive || false,
      createdBy: createdBy  // <-- optional, save admin who created the test
    });

    await mockTest.save();

    res.status(201).json({ success: true,status:true, msg:'Mocktest Create Successfull' });

  } catch (err) {
    console.error(err);
    res.status(500).json({status:false, error: err.message });
  }
};
// GET /api/mocktest/questions
// Body: { questionIds: ["id1", "id2", ...] }

const fetchQuestionsByIds = async (req, res) => {
  try {
    const { questionIds } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    // Fetch questions from DB
    const questions = await MockTestQuestions.find({ _id: { $in: questionIds } });

    if (!questions || questions.length === 0) {
      return res.status(404).json({ error: "No questions found for the provided IDs" });
    }

    res.status(200).json({ success: true, questions });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const getMockTestCategories = async (req, res) => {
  try {
    // Fetch distinct categories only from active mock tests
    const categories = await MockTest.distinct("category", { isActive: true });

    // Add "All" at the beginning
    const categoryList = ["All", ...categories.filter(Boolean)];

    res.json({ success: true, categories: categoryList });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


// list of mock test set
const listMockTests = async (req, res) => {
  try {
    const { isPremium = false, lang = "en", page = 1, limit = 10, keyword, category, type } = req.query;

    const pageNum = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNum - 1) * pageSize;

    // Build filter
    const filter = { isActive: true }; // Only active mock tests

    if (!isPremium) {
      filter.isPremium = false;
    }

    if (keyword && keyword.trim() !== "") {
      filter.$or = [
        { "title.en": { $regex: keyword, $options: "i" } },
        { "title.hi": { $regex: keyword, $options: "i" } },
        { "title.bn": { $regex: keyword, $options: "i" } }
      ];
    }

    if (category && category !== "All") {
      filter.category = category;
    }

    if (type === "Free") {
  filter.isPremium = false;
} else if (type === "Premium") {
  filter.isPremium = true;
}


    const total = await MockTest.countDocuments(filter);

    const tests = await MockTest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .select("title subjects duration isPremium createdAt questions category")
      .lean();

    const responseTests = tests.map(test => {
      const canAccess = !test.isPremium || isPremium;
      return {
        _id: test._id,
        title: test.title[lang] || test.title.en,
        subjects: test.subjects,
        category: test.category,
        duration: test.duration,
        isPremium: test.isPremium,
        isActive: canAccess,
        createdAt: test.createdAt,
        questionCount: test.questions ? test.questions.length : 0,
        totalMark: test.questions ? test.questions.length : 0
      };
    });

    res.json({
      total,
      page: pageNum,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      mockTests: responseTests
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



// Get questions for as per mock tests for user
// const getMockTestQuestions = async (req, res) => {
//   try {
//     const { mockTestId, lang = "en", page = 1, limit, userId } = req.query;
//     // const userId = req.user?._id; // assuming authentication middleware
//     // console.log(userId);
    
//     if (!mongoose.Types.ObjectId.isValid(mockTestId)) {
//       return res.status(400).json({ error: "Invalid MockTest ID" });
//     }

//     // Fetch mock test metadata
//     const test = await MockTest.findById(mockTestId, "title subjects duration isPremium questions").lean();
//     if (!test) return res.status(404).json({ error: "MockTest not found" });

//     // Access control based on isPremium
//     let canAccess = true;
//     if (test.isPremium === true) {
//       // Check if user is premium
//       if (!userId) return res.status(401).json({ error: "User not authenticated" });
//       const user = await User.findById(userId).select("isPremium").lean();
//       if (!user || !user.isPremium) canAccess = false;
//     }

//     if (!canAccess) return res.status(403).json({ error: "Premium access required" });
//     // Pagination
//     // const MAX_LIMIT = parseInt(process.env.MAX_QUESTION_LIMIT) || 100;
//     const MAX_LIMIT = Math.min(Math.max(parseInt(process.env.MAX_QUESTION_LIMIT) || 100, 100), 200);
//     const pageNum = Math.max(1, parseInt(page));
//     const pageSize = Math.min(Math.max(1, parseInt(limit) || MAX_LIMIT), MAX_LIMIT);
//     const totalQuestions = test.questions.length;
//     const totalPages = Math.ceil(totalQuestions / pageSize);

//     // Slice question IDs for pagination
//     const sliceIds = test.questions.slice((pageNum - 1) * pageSize, pageNum * pageSize);

//     // Fetch questions from MongoDB
//     let questions = await MockTestQuestions.find({ _id: { $in: sliceIds } })
//       .select("questionText options correctOption")
//       .lean();

//     // Map for order preservation
//     const questionsMap = new Map();
//     questions.forEach(q => questionsMap.set(q._id.toString(), q));
//     questions = sliceIds.map(id => questionsMap.get(id.toString())).filter(Boolean);

//     // Map question text + options based on language
//     const questionsInLang = questions.map(q => ({
//       _id: q._id,
//       questionText: q.questionText?.[lang] || q.questionText?.en || "",
//       options: q.options.map(opt => ({
//         optionId: opt.optionId,
//         text: opt.text?.[lang] || opt.text?.en || ""
//       })),
//       correctOption: q.correctOption
//     }));

//     res.json({
//       _id: test._id,
//       title: test.title?.[lang] || test.title?.en || "",
//       duration: test.duration,
//       isPremium: test.isPremium,
//       isActive: true,
//       totalQuestions,
//       page: pageNum,
//       pageSize,
//       totalPages,
//       questions: questionsInLang
//     });

//   } catch (err) {
//     console.error("🔥 getMockTestQuestions error:", err);
//     res.status(500).json({ error: err.message });
//   }
// };

// In-memory cache
const mockTestCache = new Map();
const setCacheWithExpiry = (key, data, ttlMs = 90 * 60 * 1000) => {
  mockTestCache.set(key, data);
  const timer = setTimeout(() => mockTestCache.delete(key), ttlMs);
  if (timer.unref) timer.unref();
};
// Watch for updates/deletes to clear cache
MockTest.watch().on("change", (change) => {
  if (["update", "delete"].includes(change.operationType)) {
    const id = change.documentKey?._id?.toString();
    if (id && mockTestCache.has(id)) {
      mockTestCache.delete(id);
      console.log(`🧹 Cache cleared for MockTest ID: ${id}`);
    }
  }
});

MockTestQuestions.watch().on("change", (change) => {
  if (["update", "delete"].includes(change.operationType)) {
    const id = change.documentKey?._id?.toString();
    // Iterate over cached tests and remove/update this question
    for (let [mockTestId, data] of mockTestCache.entries()) {
      const updatedQuestions = data.rawQuestions.filter(q => q._id.toString() !== id);
      if (updatedQuestions.length !== data.rawQuestions.length) {
        data.rawQuestions = updatedQuestions;
        mockTestCache.set(mockTestId, data);
        console.log(`🧹 Question ${id} removed from MockTest ${mockTestId} cache`);
      }
    }
  }
});

const getMockTestQuestions = async (req, res) => {
  try {
    const { mockTestId, lang = "en", page = 1, limit, userId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(mockTestId)) {
      return res.status(400).json({ success: false, message: "Invalid MockTest ID" });
    }

    let testData;
    if (mockTestCache.has(mockTestId)) {
      testData = mockTestCache.get(mockTestId);
    } else {
      // Fetch mock test
      const test = await MockTest.findById(mockTestId, "title subjects duration isPremium questions").lean();
      if (!test) return res.status(404).json({ success: false, message: "MockTest not found" });

      // Access control for premium test
      if (test.isPremium) {
        if (!userId) return res.status(401).json({ success: false, message: "User not authenticated" });
        const user = await User.findById(userId).select("isPremium").lean();
        if (!user || !user.isPremium) return res.status(403).json({ success: false, message: "Premium access required" });
      }

      // Fetch all questions (raw)
      const allQuestions = await MockTestQuestions.find({ _id: { $in: test.questions } })
        .select("questionText options correctOption")
        .lean();

      testData = { test, rawQuestions: allQuestions };
      setCacheWithExpiry(mockTestId, testData);
    }

    const { test, rawQuestions } = testData;

    // Pagination
    const MAX_LIMIT = 200;
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(Math.max(1, parseInt(limit) || MAX_LIMIT), MAX_LIMIT);
    const totalQuestions = test.questions.length;
    const totalPages = Math.ceil(totalQuestions / pageSize);
    const sliceIds = test.questions.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    // Map raw questions for order and language
    const questionMap = new Map(rawQuestions.map(q => [q._id.toString(), q]));
    const orderedQuestions = sliceIds
      .map(id => questionMap.get(id.toString()))
      .filter(Boolean)
      .map(q => ({
        _id: q._id,
        questionText: q.questionText?.[lang] || q.questionText?.en || "",
        options: q.options.map(opt => ({
          optionId: opt.optionId,
          text: opt.text?.[lang] || opt.text?.en || "",
        })),
        correctOption: q.correctOption,
      }));

    return res.json({
      success: true,
      fromCache: !!mockTestCache.has(mockTestId),
      _id: test._id,
      title: test.title?.[lang] || test.title?.en || "",
      duration: test.duration,
      isPremium: test.isPremium,
      totalQuestions,
      page: pageNum,
      pageSize,
      totalPages,
      questions: orderedQuestions,
    });

  } catch (err) {
    console.error("🔥 getMockTestQuestions error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching mock test questions" });
  }
}


// user mock test flow

// Submit answer for a question
const finalSubmitMockTest = async (req, res) => {
  try {
    let { mockTestId, userId, answers = [], startTime } = req.body;
    const endTime = new Date();
    const start = new Date(startTime);
    // ✅ Fetch test with all question IDs
    const test = await MockTest.findById(mockTestId).select("questions");
    if (!test) {
      return res.status(404).json({ success: false, message: "MockTest not found" });
    }
    // ✅ Ensure max attempts if needed
    const previousAttempts = await UserMockTest.find({ userId, mockTestId });
    const attemptNumber = previousAttempts.length + 1;
    // ✅ Convert answers array to a Map for quick lookup
    const answerMap = new Map(
      answers
        .filter(a => a.questionId) // skip invalid IDs
        .map(a => [String(a.questionId), a])
    );
    // ✅ Add missing questions as notAttempted
    for (const qId of test.questions) {
      if (!answerMap.has(String(qId))) {
        answerMap.set(String(qId), {
          questionId: qId,
          selectedOption: null,
          status: "notAttempted"
        });
      }
    }
    // ⚡️ Fetch all question correct answers in a single DB query
    const questionIds = Array.from(answerMap.keys()).filter(id => id && id !== "null");
    const questions = await MockTestQuestions.find({ _id: { $in: questionIds } })
      .select("correctOption")
      .lean();
    const questionMap = new Map(questions.map(q => [String(q._id), q.correctOption]));
    // ✅ Prepare counts
    // Initialize counters
    let attemptedCount = 0;
    let notAttemptedCount = 0;
    let markedCount = 0;
    let rightCount = 0;
    let wrongCount = 0;
    const finalAnswers = [];
    for (const ans of answerMap.values()) {
      let status = ans.status;
      if (status === "visitedNotAnswered" || status === "notVisited") {
        status = "notAttempted";
      }
      const correctOption = questionMap.get(String(ans.questionId));
      const isCorrect = correctOption === ans.selectedOption;
      finalAnswers.push({
        questionId: ans.questionId,
        selectedOption: ans.selectedOption || null,
        status,
        isCorrect
      });
      if (status === "attempted") {
        attemptedCount++;
        if (isCorrect) rightCount++;
        else wrongCount++;
      } else if (status === "marked") {
        markedCount++;
      } else if (status === "notAttempted") {
        notAttemptedCount++;
      }
    }
    // ✅ Save submission
    const submission = new UserMockTest({
      mockTestId,
      userId,
      answers: finalAnswers,
      attemptedCount,
      notAttemptedCount,
      markedCount,
      rightCount,
      wrongCount,
      startTime: start,
      endTime,
      timeTaken: Math.floor((endTime - start) / 1000),
      maxAttempt: attemptNumber
    });

    await submission.save();

    res.json({
      success: true,
      message: "Exam submitted successfully!",
      summary: {
        attemptedCount,
        notAttemptedCount,
        markedCount,
        rightCount,
        wrongCount,
        timeTaken: Math.floor((endTime - start) / 1000)
      }
    });
  } catch (err) {
    console.error("🔥 finalSubmitMockTest error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const maxMockTestAttempts = async (req, res) => {
  try {
    const { mockTestId, userId } = req.query;
    const maxAttempts = 2; // change as needed

    // Count how many times user already attempted this test
    const attemptCount = await UserMockTest.countDocuments({ mockTestId, userId });
    const remaining = Math.max(0, maxAttempts - attemptCount);

    res.json({ success: true, attemptCount, remaining });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getMockTestQuestions,
  getQuestions,
  addMockQuestion,
  createMockTest,
  listMockTests,
  maxMockTestAttempts,
  finalSubmitMockTest,
  fetchQuestionsByIds,
  getMockTestCategories
};
