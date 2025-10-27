const mongoose = require('mongoose');
const { Schema } = mongoose;

const AffiliateSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  phone: { type: String, required: true, unique: true, index: true },
 promotionPlatforms: [
    {
      platform: { type: String, required: true },
      url: { type: String, required: true }
    }
  ],
  referralCode: { type: String, required: true, unique: true, index: true },
  totalReferrals: { type: Number, default: 0 },
  totalCommissionEarned: { type: Number, default: 0 },
  bankAccountNumber: { type: String },
  ifscCode: { type: String },
  bankName: { type: String },
  upiId: { type: String },
  panCardNo: { type: String},
  panCardNoUrl: { type: String, default:null},
  aadharCardNo: { type: String},
  aadharCardNoUrl: { type: String, default:null},
  status: {type: String, enum: ['Pending', 'Approved', 'Rejected'],default: 'Pending',index: true},
  approvedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  approvedAt: { type: Date },
  rejectionReason: { type: String, default: '' } 
}, { timestamps: true });

module.exports = mongoose.model('AffiliateUser', AffiliateSchema);
