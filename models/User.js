const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  first_name: {
    type: String,
    required: true,
    trim: true,
    set: value => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : ''
  },
  middle_name: {
    type: String,
    trim: true,
    set: value => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : ''
  },
  last_name: {
    type: String,
    trim: true,
    set: value => value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : ''
  },
  phone_number: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true
  },
  dob: Date,
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Other'],
    trim: true
  },
  address: {
    type: String,
    trim: true,
    lowercase: true
  },
  pin_code: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  deviceId: {
    type: String,
    trim: true,
    required: true,
  },
  ip: {
    type: String,
    default:null
  },
  verified: {
    type: Boolean,
    default: false
  },
  isLogin: {
    type: Boolean,
    default: false
  },
  isSuspended :{
    type: Boolean,
    default: false
  },
  failedLoginAttempts:{
    type:Number,
    default:0
  },
  lastLogin: {
    type: Date
  },
  isPremium: {
    type: Boolean, default: false
  },
  premiumExpiry: {
    type: Date
  },
  referredBy: {
    type: String,
    trim: true,
    lowercase: true
  },
  referralCode: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true
  },
  hasPurchased: {
    type: Boolean, default: false

  },
  referralCommissionGiven: {
    type: Boolean, default: false
  },
  wallet: { type: Number, default: 0 },
  resetPasswordToken: {
    type: String,
  },
  resetPasswordExpire: {
    type: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
