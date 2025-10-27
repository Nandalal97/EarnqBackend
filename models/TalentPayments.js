const mongoose = require('mongoose');
const { Schema } = mongoose;

const TalentPaymentSchema = new Schema({
  bookingId: { 
    type: Schema.Types.ObjectId, 
    ref: 'TalentBooking', 
    required: true, 
    index: true 
  }, // links to TalentBooking
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  orderId: { type: String, unique: true, required: true },
  status: { type: String, default: 'Pending' },
  paidAt: { type: Date }
}, { timestamps: true });


module.exports = mongoose.model('TalentPayment', TalentPaymentSchema);
