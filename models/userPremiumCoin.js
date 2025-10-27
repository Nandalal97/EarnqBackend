const mongoose = require("mongoose");

const userPremuimCoin = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  startDate: {
    type: Date,
    required: true,
  },
  expireDate: {
    type: Date,
    required: true,
  },
  totalPremiumCoins: {
    type: Number,
    required: true,
  }
});

module.exports = mongoose.model("PremuimCoins", userPremuimCoin);
