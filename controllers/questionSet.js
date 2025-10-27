const ContestQuestionSet = require('../models/ContestQuestionSet');
const AdminUser = require('../models/admin/AdminModel');
const ContestQuestion = require('../models/ContestQuestion'); 

// Create a new ContestQuestionSet
const CreateQuestionSet = async (req, res) => {
    try {
        const { title, subject, language, createdBy } = req.body;


        // Validation
        if (!title || !subject || !language || !createdBy) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        // Check if admin ID exists in Admin table (optional but recommended)

        const adminExists = await AdminUser.findById(createdBy);
        if (!adminExists) {
            return res.status(404).json({ success: false, message: 'Admin user not found.' });
        }


        // Check for duplicate title (case-insensitive)
        const existingSet = await ContestQuestionSet.findOne({
            title: { $regex: new RegExp('^' + title + '$', 'i') }
        });

        if (existingSet) {
            return res.status(409).json({ success: false, message: 'Question set already exists.' });
        }

        // Create new set
        const newSet = new ContestQuestionSet({
            title,
            subject,
            language,
            createdBy,
        });

        await newSet.save();

        res.status(201).json({ success: true, message: 'Question set created successfully.', data: newSet });
    } catch (error) {
        console.error('Create QuestionSet Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// Get all question sets (with optional filters)
const GetAllQuestionSets = async (req, res) => {
  try {
    const { page = 1, limit = 10, title, language, subject } = req.query;

    const filter = {};
    if (language) filter.language = language;
    if (subject) filter.subject = subject;
    if (title) filter.title = { $regex: title, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await ContestQuestionSet.countDocuments(filter);

    const sets = await ContestQuestionSet.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const setsWithCounts = await Promise.all(
      sets.map(async (set) => {
        const questionCount = await ContestQuestion.countDocuments({ questionSetId: set._id });
        return {
          ...set.toObject(),
          totalQuestions: questionCount,
        };
      })
    );

    res.json({
      success: true,
      data: setsWithCounts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
       totalSets: total
    });
  } catch (error) {
    console.error('Fetch All QuestionSets Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


const GetQuestionSetsForCreateContest = async (req, res) => {
  try {
    // Fetch all sets without any pagination
    const sets = await ContestQuestionSet.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    // Add totalQuestions for each set
    const setsWithCounts = await Promise.all(
      sets.map(async (set) => {
        const questionCount = await ContestQuestion.countDocuments({ questionSetId: set._id });
        return {
          ...set.toObject(),
          totalQuestions: questionCount,
        };
      })
    );

    res.json({
      success: true,
      data: setsWithCounts,
      totalSets: setsWithCounts.length, // total number of sets
    });
  } catch (error) {
    console.error('Fetch All QuestionSets Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get a single question set by ID
const GetQuestionSetById = async (req, res) => {
    try {
        const set = await ContestQuestionSet.findById(req.params.id).populate('createdBy', 'name email');
        if (!set) {
            return res.status(404).json({ success: false, message: 'Question set not found' });
        }
        res.json({ success: true, data: set });
    } catch (error) {
        console.error('Get QuestionSet By ID Error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


// Update question set

const UpdateQuestionSet = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subject, language, createdBy } = req.body;

    // Validate input
    if (!title || !subject || !language || !createdBy) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Check if admin exists
    const adminExists = await AdminUser.findById(createdBy);
    if (!adminExists) {
      return res.status(404).json({ success: false, message: 'Admin user not found.' });
    }

    // Check for duplicate title (excluding current record)
    const duplicateTitle = await ContestQuestionSet.findOne({
      _id: { $ne: id },
      title: { $regex: new RegExp('^' + title.trim() + '$', 'i') }
    });

    if (duplicateTitle) {
      return res.status(409).json({ success: false, message: 'A question set with this title already exists.' });
    }

    // Find and update
    const updatedSet = await ContestQuestionSet.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        subject,
        language,
        createdBy,
      },
      { new: true }
    );

    if (!updatedSet) {
      return res.status(404).json({ success: false, message: 'Question set not found.' });
    }

    res.status(200).json({ success: true, message: 'Question set updated successfully.', data: updatedSet });
  } catch (error) {
    console.error('Update QuestionSet Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete a question set
const DeleteQuestionSet = async (req, res) => {
  try {
    // Step 1: Delete the question set
    const deletedSet = await ContestQuestionSet.findByIdAndDelete(req.params.id);

    if (!deletedSet) {
      return res.status(404).json({ success: false, message: 'Question set not found' });
    }

    // Step 2: Delete all associated questions
    await ContestQuestion.deleteMany({ questionSetId: req.params.id });

    res.json({ success: true, message: 'Question set and associated questions deleted successfully.' });
  } catch (error) {
    console.error('Delete QuestionSet Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
module.exports = { CreateQuestionSet, GetAllQuestionSets, 
  GetQuestionSetById,UpdateQuestionSet, DeleteQuestionSet, GetQuestionSetsForCreateContest }
