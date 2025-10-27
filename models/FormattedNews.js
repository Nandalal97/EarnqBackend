const mongoose = require('mongoose');

const FormattedNewsSchema = new mongoose.Schema({
    rawNews: { type: mongoose.Schema.Types.ObjectId, ref: 'RawNews', required: true },
    heading: { 
        en: String, 
        hi: String, 
        bn: String,
        mr: String,
        gu: String,
        pa: String,
        ta: String,
        te: String,
        or: String,
        kn: String,
    },
    shortDescription: { 
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
    keyPoints: { 
        en: [String], 
        hi: [String], 
        bn: [String],
        mr: [String],
        gu: [String],
        pa: [String],
        ta: [String],
        te: [String],
        or: [String],
        kn: [String]
    },
    createdAt: { type: Date, default: Date.now, index: true }
});
FormattedNewsSchema.index({ createdAt: -1 });
module.exports = mongoose.model('FormattedNews', FormattedNewsSchema);
