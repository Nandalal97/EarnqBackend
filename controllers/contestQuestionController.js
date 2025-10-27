const ContestQuestion = require('../models/ContestQuestion');
const ContestQuestionSet = require('../models/ContestQuestionSet');
const Admin = require('../models/admin/AdminModel');
const mongoose = require("mongoose");
const MockTestQuestions = require('../models/MockTestQuestionSchema');

const contestQuestionsGenerated= async (req, res) => {
 try {
    const { language, questionsPerSubject, questionSetId, createdBy } = req.body;
    const contestQuestions = [];

    for (const [subject, count] of Object.entries(questionsPerSubject)) {
      // fetch random questions for this subject
      const questions = await MockTestQuestions.aggregate([
        { $match: { subjects: subject } },
        { $sample: { size: count } }
      ]);

      for (const q of questions) {
        const options = q.options.map(opt => opt.text[language] || opt.text['en']); // string array
        const correctIndex = q.options.findIndex(opt => opt.optionId === q.correctOption);

        contestQuestions.push({
          questionSetId,
          questionText: q.questionText[language] || q.questionText['en'],
          options,
          correctAnswer: correctIndex,
          createdBy
        });
      }
    }

    // insert all contest questions
    await ContestQuestion.insertMany(contestQuestions);

    res.status(200).json({
      success: true,
      message: 'Contest questions generated successfully',
      total: contestQuestions.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// 1. Add a question
const CreateQuestion = async (req, res) => {
  try {
    const { questionSetId, questionText, options, correctAnswer, createdBy } = req.body;

    if (!questionSetId || !questionText || !options || correctAnswer === undefined || !createdBy) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Verify question set exists
    const setExists = await ContestQuestionSet.findById(questionSetId);
    if (!setExists) {
      return res.status(404).json({ success: false, message: 'Question set not found.' });
    }

    // Verify admin
    const adminExists = await Admin.findById(createdBy);
    if (!adminExists) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    const question = new ContestQuestion({
      questionSetId,
      questionText,
      options,
      correctAnswer,
      createdBy,
    });

    await question.save();

    res.status(201).json({ success: true, message: 'Question added successfully.', data: question });
  } catch (error) {
    console.error('CreateQuestion Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// get user for fronend 
// GET /contest/questionSet/:setId/questions?page=1&limit=1
// GET /contest/questionSet/:setId/all
// const getQuestionsForExams = async (req, res) => {
//   try {
//     const { setId } = req.params;
//     const { page = 1, limit = 10 } = req.query;

//     const skip = (parseInt(page) - 1) * parseInt(limit);

//     const totalQuestions = await ContestQuestion.countDocuments({ questionSetId: setId });

//     const questions = await ContestQuestion.find({ questionSetId: setId })
//       .sort({ createdAt: 1 })
//       .skip(skip)
//       .limit(parseInt(limit));

//     res.json({
//       success: true,
//       data: questions,
//       totalQuestions,
//       totalPages: Math.ceil(totalQuestions / limit),
//       currentPage: parseInt(page),
//     });
//   } catch (error) {
//     console.error('Error fetching paginated contest questions:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

// 🧠 In-memory cache (keyed by setId)
const contestCache = new Map();
// 🧹 Auto-clean cache entries after a timeout
const setCacheWithExpiry = (key, data, contestDurationMinutes = 90) => {
  // Ensure cache lasts at least the exam duration
  const ttlMs = Math.max(contestDurationMinutes * 60 * 1000, 30 * 60 * 1000); // min 90 min
  contestCache.set(key, data);

  const timer = setTimeout(() => {
    contestCache.delete(key);
  }, ttlMs);

  // prevent timer from keeping process alive
  if (timer.unref) timer.unref();
};

// 👀 Watch for question updates or deletions to clear cache immediately
ContestQuestion.watch().on("change", (change) => {
  if (["update", "delete"].includes(change.operationType)) {
    const changedId = change.documentKey?._id?.toString();
    console.log(`⚡ ContestQuestion ${change.operationType} detected for ID: ${changedId}`);

    // Find and invalidate any contest set that contains this question
    for (let [setId, questions] of contestCache.entries()) {
      const found = questions.some((q) => q._id.toString() === changedId);
      if (found) {
        contestCache.delete(setId);
        console.log(`🧹 Cache invalidated for contest setId: ${setId}`);
      }
    }
  }
});


// 🚀 Controller: Get contest questions
const getQuestionsForExams = async (req, res) => {
  try {
    const { setId } = req.params;
    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = parseInt(req.query.limit, 10) || 10;

    // ✅ Serve from cache if available
    if (contestCache.has(setId)) {
      const allQuestions = contestCache.get(setId);
      const start = (pageNum - 1) * limitNum;
      const data = allQuestions.slice(start, start + limitNum);

      return res.json({
        success: true,
        data,
        totalQuestions: allQuestions.length,
        totalPages: Math.ceil(allQuestions.length / limitNum),
        currentPage: pageNum,
        fromCache: true,
      });
    }

    // ⚙️ First-time load: fetch all questions from DB
    const questions = await ContestQuestion.find({ questionSetId: setId })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    if (!questions || questions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No questions found for this set.',
      });
    }

    // 🧠 Cache data in memory for fast access
    setCacheWithExpiry(setId, questions);

    // Pagination slice
    const start = (pageNum - 1) * limitNum;
    const data = questions.slice(start, start + limitNum);

    res.json({
      success: true,
      data,
      totalQuestions: questions.length,
      totalPages: Math.ceil(questions.length / limitNum),
      currentPage: pageNum,
      fromCache: false,
    });

  } catch (error) {
    console.error('❌ Error fetching contest questions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching questions',
    });
  }
};



// 2. Get all questions for a set
const GetQuestionsBySet = async (req, res) => {
  try {
    const { setId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!mongoose.Types.ObjectId.isValid(setId)) {
      return res.status(400).json({ success: false, message: "Invalid question set ID" });
    }

    const skip = (page - 1) * limit;

    const questions = await ContestQuestion.find({ questionSetId: setId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ContestQuestion.countDocuments({ questionSetId: setId });

    res.json({
      success: true,
      data: questions,
      pagination: {
        total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasNextPage: skip + questions.length < total,
      },
    });
  } catch (error) {
    console.error("GetQuestionsBySet Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// 3. Get single question by ID
const GetQuestionById = async (req, res) => {
  try {
    const question = await ContestQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    res.json({ success: true, data: question });
  } catch (error) {
    console.error('GetQuestionById Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4. Update question
const UpdateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, options, correctAnswer } = req.body;

    const updated = await ContestQuestion.findByIdAndUpdate(
      id,
      { questionText, options, correctAnswer },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    res.json({ success: true, message: 'Question updated.', data: updated });
  } catch (error) {
    console.error('UpdateQuestion Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Delete question
const DeleteQuestion = async (req, res) => {
  try {
    const deleted = await ContestQuestion.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Question not found.' });
    }

    res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('DeleteQuestion Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  CreateQuestion,
  GetQuestionsBySet,
  GetQuestionById,
  UpdateQuestion,
  DeleteQuestion,
  getQuestionsForExams,
  contestQuestionsGenerated
};


