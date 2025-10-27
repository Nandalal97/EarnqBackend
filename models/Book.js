const mongoose = require('mongoose');
const Counter = require('./Counter');

const bookSchema = new mongoose.Schema({
    bookId: {
        type: Number,
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    author: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    category: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    subcategory: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true
    },
    // eBook pricing
    ebookPrice: { type: Number, required: true, min: 0 },
    ebookSalePrice: { type: Number, default: 0 },
    ebookDiscount: { type: Number, default: 0 },

    // Hard Copy pricing
    hardCopyPrice: { type: Number, required: true, min: 0 },
    hardCopySalePrice: { type: Number, default: 0 },
    hardCopyDiscount: { type: Number, default: 0 },

    bookLanguage: {
        type: String,
        enum: ['en', 'hi', 'bn', 'mr', 'gu', 'pa', 'ta', 'te', 'or', 'ka'],
        default: 'en'
    },
    coverImage: {
        type: String,
        trim: true
    },
    bookUrl: {
        type: String,
        trim: true
    },
    defaultRatings: {
        type: Number,
        default: 0
    },
   
    defaultRatingUser: {
        type: Number,
        default: 0
    },
     totalPages: {
        type:Number,
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Auto-increment bookId before saving
bookSchema.pre('save', async function (next) {
    try {
        if (!this.bookId) {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'bookId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.bookId = counter.seq;
        }
        next();
    } catch (error) {
        next(error);
    }
});


// Text index for search
bookSchema.index(
    { title: 'text', author: 'text', category: 'text', description: 'text' },
    { default_language: 'none', language_override: '_ignore' } // no conflict
);


module.exports = mongoose.model('Book', bookSchema);
