const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  name: {type: String},
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  gender: { type: String, required: true },
  address: {type: String},
  aadharNo: {type: String},
  panCard:  {type: String},
  password: { type: String, required: true },
  role: {type: String, enum: ['Superadmin', 'Admin','Support'], default: 'Admin'},
  bankAccount:{type:String},
  BankName:{type:String},
  ifscCode:{type:String},
  profileImage: {type: String},
  aadharUrl: {type: String},
  panCardUrl: {type: String},
  isActive:  {type: String, enum: ['active', 'inActive'], default: 'active'},
  lastLoginAt: {type: Date},
  otpVerified: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.models.Admin || mongoose.model('Admin', AdminSchema);
