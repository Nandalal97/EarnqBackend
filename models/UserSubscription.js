// models/UserSubscription.js
const mongoose = require('mongoose');

const userSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  planCode: {
    type: String,
    enum: ['free', 'premium'], // restrict allowed values
    required: true
  },
  billingCycle: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  transactionId: {
    type: String,
    index: true,
    default: null
  },
  basePrice: {
    type: Number,
  },
  discounts: {
    type: Number,
  },
  payAmount: {
    type: Number,
    required: true
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Optional: Automatically deactivate past subscriptions
userSubscriptionSchema.pre('save', function (next) {
  if (this.endDate < new Date()) {
    this.isActive = false;
  }
  next();
});

module.exports = mongoose.model('Subscription', userSubscriptionSchema);
