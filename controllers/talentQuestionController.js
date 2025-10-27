const TalentQuestion = require('../models/TalentQuestion');

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
    const { contestId, slotId, lang } = req.params; // lang = "en", "bn", "hi"

    const questions = await TalentQuestion.find({ contestId, slotId });

    // Map questions to selected language
    const localizedQuestions = questions.map(q => ({
      _id: q._id,
      questionText: q.questionText.get(lang) || q.questionText.get("en"),
      questionType: q.questionType,
      marks: q.marks,
      options: q.options.map(o => ({
        optionText: o.optionText.get(lang) || o.optionText.get("en"),
        isCorrect: o.isCorrect
      }))
    }));

    res.json({ questions: localizedQuestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
module.exports={
    addTalentQuestion,
    getTalentQuestions
}
