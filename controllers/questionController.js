const Question = require('../models/Question');
const Category = require('../models/Category');
const Subject = require('../models/Subject');


const addQuestion = async (req, res) => {
  try {
    let { question_id, category, subject, correct_option, translations } = req.body;

    // Validate required top-level fields
    if (!category || !subject || !correct_option) {
      return res.status(400).json({ status: 0, msg: 'Required fields missing (category, subject, correct_option)' });
    }

    // Validate category and subject IDs
    const catDoc = await Category.findById(category);
    const subDoc = await Subject.findById(subject);

    // const categoryEn = catDoc.categoryName?.get('en');
    // const subjectEn = subDoc.subjectName?.get('en');
    // console.log(categoryEn, subjectEn);

    if (!catDoc || !subDoc) {
      return res.status(400).json({ status: 0, msg: 'Invalid category or subject ID' });
    }

    // Extract initials for question_id prefix
    let depInitial = 'x';
    if (typeof catDoc?.categoryName?.get('en') === 'string') {
      depInitial = catDoc.categoryName?.get('en').trim().toLowerCase()[0] || 'x';
    }

    let catInitial = 'x';
    if (typeof subDoc?.subjectName?.get('en') === 'string') {
      catInitial = subDoc.subjectName?.get('en').trim().toLowerCase()[0] || 'x';
    }

    const prefix = depInitial + catInitial;



    // If question_id provided, ensure it's unique
    const idExists = question_id ? await Question.findOne({ question_id }) : true;

    // Auto-generate question_id if not provided or already exists
    if (!question_id || idExists) {
      const last = await Question.findOne({
        question_id: { $regex: `^${prefix}_q\\d+$` }
      }).sort({ question_id: -1 });

      const lastNum = last ? parseInt(last.question_id.split('_q')[1]) || 0 : 0;
      const nextNum = lastNum + 1;
      question_id = `${prefix}_q${nextNum.toString().padStart(3, '0')}`;
    }
    // Save question to DB
    const question = new Question({
      question_id,
      category,
      subject,
      correct_option,
      translations
    });
    await question.save();
    return res.status(201).json({
      status: 1,
      msg: 'Question added successfully',
      question_id
    });
  } catch (err) {
    console.error('Add Question Error:', err);
    res.status(500).json({
      status: 0,
      message: 'Server Error',
      error: err.message
    });
  }
};

// get one qustions 
const getSigleQuestion = async (req, res) => {
  const { question_id, language } = req.body;

  try {
    const question = await Question.findOne({ question_id });

    if (!question) {
      return res.status(404).json({ msg: 'Question not found', status: 0 });
    }

    const translated = question.translations.get(language) || question.translations.get('en');

    if (!translated) {
      return res.status(400).json({ msg: 'Translation not available', status: 0 });
    }

    res.json({
      question_id: question.question_id,
      correct_option: question.correct_option,
      question: translated.question,
      options: translated.options,
      explanation: translated.explanation
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


//------------- Start ---------------//

// Get all questions, with optional random fetch
// const getAllQuestions = async (req, res) => {
//   try {
//     const { category, subject, page = 1, limit = 100, random } = req.query;
//     const filter = {};

//     if (category) filter.category = category;
//     if (subject) filter.subject = subject;

//     const parsedLimit = parseInt(limit);
//     const parsedPage = parseInt(page);

//     if (random === 'true') {
//       // Use MongoDB aggregation to fetch random questions with filter
//       const questions = await Question.aggregate([
//         { $match: filter },
//         { $sample: { size: parsedLimit } }
//       ]);

//       return res.status(200).json({
//         questions,
//         totalQuestions: questions.length,
//         totalPages: 1,
//         currentPage: 1
//       });
//     }

//     // Standard paginated fetch
//     const skip = (parsedPage - 1) * parsedLimit;
//     const totalQuestions = await Question.countDocuments(filter);
//     const questions = await Question.find(filter)
//       .sort({ createdAt: -1 }) // latest first
//       .skip(skip)
//       .limit(parsedLimit);

//     res.status(200).json({
//       questions,
//       totalQuestions,
//       totalPages: Math.ceil(totalQuestions / parsedLimit),
//       currentPage: parsedPage
//     });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// };

// In-memory cache
const questionCache = new Map();
const MAX_CACHE_ENTRIES = 100;
const CACHE_TTL_MAX = 180;

// Helper: shuffle array
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Set cache with TTL
function setCache(key, data) {
  // Random TTL between min and max minutes
    const ttlMs = CACHE_TTL_MAX * 60 * 1000;
  // Remove oldest if cache full
  if (questionCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = questionCache.keys().next().value;
    questionCache.delete(firstKey);
  }
  // Clear old timer if exists
  if (questionCache.has(key) && questionCache.get(key).timer) {
    clearTimeout(questionCache.get(key).timer);
  }
  const timer = setTimeout(() => questionCache.delete(key), ttlMs);
  if (timer.unref) timer.unref(); // allow node to exit if timer is only thing left
  questionCache.set(key, { questions: data, timer });
}

// Main API
const getAllQuestions = async (req, res) => {
  try {
    const { category, subject, limit = 100, random } = req.query;

    const parsedLimit = parseInt(limit);
    const filter = {};
    if (category) filter.category = category;
    if (subject) filter.subject = subject;

    const cacheKey = JSON.stringify({ category, subject, random });

    // Check cache first
    if (questionCache.has(cacheKey)) {
      const cachedData = questionCache.get(cacheKey).questions;
      return res.status(200).json({
        questions: cachedData.slice(0, parsedLimit),
        totalQuestions: cachedData.length,
        fromCache: true
      });
    }

    // Fetch from DB
    let questions = [];
    if (random === "true") {
      questions = await Question.aggregate([{ $match: filter }, { $sample: { size: parsedLimit } }]);
    } else {
      questions = await Question.find(filter).sort({ createdAt: -1 }).limit(parsedLimit);
    }

    // Shuffle if needed
    questions = shuffleArray(questions);

    // Save to cache
    setCache(cacheKey, questions);

    return res.status(200).json({
      questions: questions.slice(0, parsedLimit),
      totalQuestions: questions.length,
      fromCache: false
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

//------------- end ---------------//

//------------- start ---------------//
// get question category and subject ways
// controllers/questionController.js

// const getQuestionsByCategoryAndSubject = async (req, res) => {
//   try {
//     const { category, subject, page = 1, limit = 10, lang = "en" } = req.query;

//     const filter = {};
//     if (category) filter.category = category;
//     if (subject) filter.subject = subject;

//     const totalQuestions = await Question.countDocuments(filter);
//     const totalPages = Math.ceil(totalQuestions / limit);

//     const questions = await Question.find(filter)
//       .populate("category", "categoryName")
//       .populate("subject", "subjectName")
//       .sort({ _id: -1 })
//       .skip((parseInt(page) - 1) * parseInt(limit))
//       .limit(parseInt(limit))
// .select("question_id category subject correct_option translations createdAt")


//     // ✅ Only return requested language
//     const formatted = questions.map(q => ({
//       _id:q._id,
//   question_id: q.question_id,
//   category: q.category,
//   subject: q.subject,
//   correct_option: q.correct_option,
//   translation: q.translations[lang] || q.translations["en"],
//   translations: q.translations,   // ✅ send full map
//   createdAt: q.createdAt
// }));

//     res.status(200).json({
//       questions: formatted,
//       totalQuestions,
//       totalPages,
//       currentPage: parseInt(page),
//     });
//   } catch (err) {
//     res.status(500).json({ msg: "Server error", error: err.message });
//   }
// };

// ✅ In-memory cache and user progress store
const questionSetCache = new Map();
const userPracticeState = new Map();
const MAX_CACHE_SIZE = 1000;

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function setCacheWithExpiry(key, data, ttlMinutes = 90) {
  const ttlMs = Math.max(ttlMinutes * 60 * 1000, 30 * 60 * 1000);
  if (questionSetCache.size >= MAX_CACHE_SIZE) {
    const firstKey = questionSetCache.keys().next().value;
    questionSetCache.delete(firstKey);
  }
  questionSetCache.set(key, data);
  const timer = setTimeout(() => questionSetCache.delete(key), ttlMs);
  if (timer.unref) timer.unref();
}

const getQuestionsByCategoryAndSubject = async (req, res) => {
  try {
    const { category, subject, lang = "en", action = "start", random = "true" } = req.query;
    const userId = req.query.userId;
    if (!userId)
      return res.status(400).json({ success: false, message: "userId required" });

    const filter = {};
    if (category) filter.category = category;
    if (subject) filter.subject = subject;

    const cacheKey = JSON.stringify({ filter });

    // ✅ Always fetch fresh questions from DB for admin panel/live effect
    let allQuestions = await Question.find(filter)
      .populate("category", "categoryName")
      .populate("subject", "subjectName")
      .sort({ _id: -1 })
      .select("question_id category subject correct_option translations createdAt")
      .lean();

    // Safe empty array
    if (!allQuestions.length) allQuestions = [];

    // ✅ Update cache with fresh data
    setCacheWithExpiry(cacheKey, allQuestions);

    const userKey = `${userId}_${cacheKey}`;

    // ✅ Initialize user session on start/restart
    if (action === "start" || action === "restart") {
      const shuffledQuestions = random === "true" ? shuffleArray([...allQuestions]) : [...allQuestions];
      userPracticeState.set(userKey, { index: 0, questions: shuffledQuestions });
    }

    // ✅ If user session exists, merge with latest DB changes
    let state = userPracticeState.get(userKey);
    if (!state) {
      // Session not found → create fresh session
      const shuffledQuestions = random === "true" ? shuffleArray([...allQuestions]) : [...allQuestions];
      state = { index: 0, questions: shuffledQuestions };
      userPracticeState.set(userKey, state);
    } else {
      // Merge updated/deleted questions into current session
      const currentIndex = state.index;
      const sessionIds = state.questions.map(q => q._id.toString());
      const freshIds = allQuestions.map(q => q._id.toString());

      // Remove deleted questions
      state.questions = state.questions.filter(q => freshIds.includes(q._id.toString()));

      // Add new questions not in session
      const newQuestions = allQuestions.filter(q => !sessionIds.includes(q._id.toString()));
      state.questions = random === "true" ? shuffleArray([...state.questions, ...newQuestions]) : [...state.questions, ...newQuestions];

      // Correct index if current question deleted
      state.index = Math.min(currentIndex, state.questions.length - 1);
      userPracticeState.set(userKey, state);
    }

    let { index, questions } = state;

    // ✅ Handle next/prev navigation
    if (action === "next") index++;
    if (action === "prev") index--;

    if (index < 0) index = 0;
    if (index >= questions.length) index = questions.length - 1;

    userPracticeState.set(userKey, { index, questions });

    const currentQuestion = questions[index] || null;
    const formatted = currentQuestion
      ? {
          _id: currentQuestion._id,
          question_id: currentQuestion.question_id,
          category: currentQuestion.category,
          subject: currentQuestion.subject,
          correct_option: currentQuestion.correct_option,
          translation: currentQuestion.translations[lang] || currentQuestion.translations["en"],
          translations: currentQuestion.translations,
          createdAt: currentQuestion.createdAt,
        }
      : null;

    res.status(200).json({
      success: true,
      question: formatted,
      allQuestions: questions,
      totalQuestions: questions.length,
      currentIndex: index,
      isLast: index === questions.length - 1,
      isFirst: index === 0,
    });

  } catch (err) {
    console.error("Error in getQuestionsByCategoryAndSubject:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};



// for admin panell

const getQuestionsByCategoryAndSubjectForAdminPanel = async (req, res) => {
  try {
    const {
      category,
      subject,
      lang = "en",
      page = 1,
      limit = 10,
    } = req.query;

    const userId = req.query.userId;
    if (!userId)
      return res.status(400).json({ success: false, message: "userId required" });

    // Build filter
    const filter = {};
    if (category) filter.category = category;
    if (subject) filter.subject = subject;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    // Count total questions for this filter
    const totalQuestions = await Question.countDocuments(filter);

    // Fetch paginated questions directly from DB
    const questions = await Question.find(filter)
      .populate("category", "categoryName")
      .populate("subject", "subjectName")
      .sort({ _id: -1 })
      .select("question_id category subject correct_option translations createdAt")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Format questions with language support
    const formattedQuestions = questions.map((q) => ({
      _id: q._id,
      question_id: q.question_id,
      category: q.category,
      subject: q.subject,
      correct_option: q.correct_option,
      translation: q.translations[lang] || q.translations["en"],
      translations: q.translations,
      createdAt: q.createdAt,
    }));

    // Send response
    res.status(200).json({
      success: true,
      allQuestions: formattedQuestions,
      totalQuestions,
      page: pageNum,
      totalPages: Math.ceil(totalQuestions / limitNum),
    });
  } catch (err) {
    console.error("Error in getQuestionsByCategoryAndSubjectForAdminPanel:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


//------------- end ---------------//
//Update a question by question_i
const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params; // use 'id' instead of 'question_id'
    const updateData = req.body;
    const updated = await Question.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return res.status(404).json({ msg: 'Question not found', status: 0 });
    }
    res.json({ msg: 'Question updated successfully', status: 1, question: updated });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

// GET a single question by question_id
const getSingleQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id); // 👈 use findById instead

    if (!question) {
      return res.status(404).json({ msg: 'Question not found', status: 0 });
    }

    res.status(200).json({
      status: 1,
      question_id: question.question_id,
      category: question.category,
      subject: question.subject,
      correct_option: question.correct_option,
      translations: question.translations

    });
  } catch (err) {
    res.status(500).json({ status: 0, msg: 'Server error', error: err.message });
  }
};

// DELETE question by ID
const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Question.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    res.status(200).json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete Error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting question' });
  }
};

module.exports = {
  addQuestion,
  getSigleQuestion,
  getAllQuestions,
  getQuestionsByCategoryAndSubject,
  getQuestionsByCategoryAndSubjectForAdminPanel,
  updateQuestion,
  getSingleQuestion,
  deleteQuestion
};