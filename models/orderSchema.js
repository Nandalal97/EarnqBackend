const mongoose = require("mongoose");
const Counter = require('./Counter');

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
        title: String,
        price: { type: Number, min: 0 },
        salePrice: { type: Number, min: 0 },
        coverImage: {type:String},
        bookUrl: {type:String},
        totalPages: { type:Number, default: 0},
        format: { type: String, enum: ['ebook', 'hardcopy'], default: 'ebook' },
        quantity: { type: Number, min: 0 },
      },
    ],
    totalAmount: { type: Number, required: true, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    totalItems: { type: Number, required: true, min: 0 },
    coupon: { type: String, default: null },
    discount: { type: Number, default: 0 },
    status: { type: String, default: "Pending"},
    paymentMethod: { type: String, enum: ["COD", "Online"], default: "Online" },
    shippingAddress: { type: String },
    PhoneNumber: { type: String },
    transactionId: { type: String },
    orderStatus: { type: String, default: "Pending"},
  },
  { timestamps: true }
);

// Pre-save hook for year + counter orderId
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderId) {
    const year = new Date().getFullYear().toString();
    // Use a unique counter per year
    const counter = await Counter.findOneAndUpdate(
      { _id: year },           // Counter ID = current year
      { $inc: { seq: 1 } },    // Increment sequence
      { new: true, upsert: true }
    );
    const seqNum = counter.seq || 1;
    const padded = seqNum.toString().padStart(6, "0"); // always 6 digits for readability

    this.orderId = `${year}${padded}`; // e.g., 202500001
  }
  next();
});
module.exports = mongoose.model("Order", orderSchema);
