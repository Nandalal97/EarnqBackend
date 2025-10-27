const mongoose = require('mongoose');

const MockTestQuestionSchema = new mongoose.Schema({
    questionText: {
        en: { type: String, required: true },
        hi: { type: String },
        bn: { type: String },
        ta: { type: String },
        te: { type: String },
        mr: { type: String },
        gu: { type: String },
        pa: { type: String },
        kn: { type: String },
        or: { type: String }
    },
    options: [
        {
            optionId: { type: String, required: true }, 
            text: {
                en: { type: String, required: true },
                hi: { type: String },
                bn: { type: String },
                ta: { type: String },
                te: { type: String },
                mr: { type: String },
                gu: { type: String },
                pa: { type: String },
                kn: { type: String },
                or: { type: String }
            }
        }
    ],
    correctOption: { type: String, required: true },
    subjects: { type: String, index: true },
    difficulty: { 
        type: String, 
        enum: ['easy', 'medium', 'hard'], 
        default: 'medium',
        index: true
    },
    tags: [{ type: String, index: true }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// ✅ Indexing for performance
MockTestQuestionSchema.index({ subjects: 1, difficulty: 1, tags: 1 });

module.exports = mongoose.model('MockTestQuestions', MockTestQuestionSchema);
