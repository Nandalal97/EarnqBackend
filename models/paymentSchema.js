// models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    userId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "Pending",
      index: true,
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true, 
  }
);

paymentSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 604800,
    partialFilterExpression: { status: "Failed" },
  }
);

// Export Payment model
module.exports = mongoose.model("BookPayment", paymentSchema);
