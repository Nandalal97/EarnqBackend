const mongoose = require("mongoose");

const subscriptionPlanSchema = new mongoose.Schema({
  planCode: {
    type: String,
    required: true,
    unique: true
  },
  basePrice: {
    type: Number,
    required: true
  },
  discounts: {
    Monthly: { type: Number, default: 0 },
    "Half-Yearly": { type: Number, default: 0 },
    Yearly: { type: Number, default: 0 }
  },
  features: [
    {
      key: { type: String, required: true },
      translations: {
        en: { type: String, required: true },
        hi: String,
        bn: String,
        mr: String,
        pa: String,
        gu: String,
        ta: String,
        te: String,
        kn: String,
        or: String
      }
    }
  ],
  name: {
    en: { type: String, required: true },
    hi: String,
    bn: String,
    mr: String,
    pa: String,
    gu: String,
    ta: String,
    te: String,
    kn: String,
    or: String
  },
  buttonText: {
    en: { type: String, required: true },
    hi: String,
    bn: String,
    mr: String,
    pa: String,
    gu: String,
    ta: String,
    te: String,
    kn: String,
    or: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
