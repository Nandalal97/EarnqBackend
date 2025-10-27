const mongoose = require('mongoose');

const RawNewsSchema = new mongoose.Schema({
    source: { type: String, required: true }, // PIB, The Hindu, etc.
    title: { type: String, required: true },
    link: { type: String },
    publishedAt: { type: Date, default: Date.now },
    rawContent: { type: String }
});

module.exports = mongoose.model('RawNews', RawNewsSchema);
