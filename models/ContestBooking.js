const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest" },
  orderID: {type:String},
  bookingAmout: {type:String, default:0},
  bookingTime: {type:Date, default: Date.now},
  paymentStatus: { type: String, default: "pending" },
  paymentDetails: {
    paymentMethod: String,
    transactionId: String,
    paidAt:  { type: Date, default: Date.now }
  },
  isAttempted: { type: Boolean, default: false },
  booked: { type: Boolean, default: false },

});

module.exports = mongoose.model("ContestBooking", bookingSchema);
