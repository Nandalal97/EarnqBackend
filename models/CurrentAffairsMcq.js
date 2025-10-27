const mongoose = require('mongoose');

const MCQSchema = new mongoose.Schema({
    news: { type: mongoose.Schema.Types.ObjectId, ref: 'FormattedNews', required: true },
    question: { 
        en: String, 
        hi: String, 
        bn: String,
        mr: String,
        gu: String,
        pa: String,
        ta: String,
        te: String,
        or: String,
        kn: String },
    options: {
        en: { a: String, b: String, c: String, d: String },
        hi: { a: String, b: String, c: String, d: String },
        bn: { a: String, b: String, c: String, d: String },
        mr: { a: String, b: String, c: String, d: String },
        gu: { a: String, b: String, c: String, d: String },
        pa: { a: String, b: String, c: String, d: String },
        ta: { a: String, b: String, c: String, d: String },
        te: { a: String, b: String, c: String, d: String },
        or: { a: String, b: String, c: String, d: String },
        kn: { a: String, b: String, c: String, d: String }
    },
    answer: { 
        en: String,
        hi: String,
        bn: String,
        mr: String,
        gu: String,
        pa: String,
        ta: String,
        te: String,
        or: String,
        kn: String
    },
    explanation: { 
        en: String,
        hi: String,
        bn: String,
        mr: String,
        gu: String,
        pa: String,
        ta: String,
        te: String,
        or: String,
        kn: String
    },
    createdAt: { type: Date, default: Date.now }
});

MCQSchema.index({ createdAt: -1 });
module.exports = mongoose.model('currentaffairsmcq', MCQSchema);
