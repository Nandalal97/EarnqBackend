const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    transactionId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    basePrice:{
        type: Number,
    },
    discounts:{
        type: Number,
    },
    payAmount: { 
        type: Number, 
        required: true
     },
    paymentMethod: { 
        type: String,
    },
    paymentStatus: { 
        type: String, 
      
    }, // success | failed | pending
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Payment', paymentSchema);
