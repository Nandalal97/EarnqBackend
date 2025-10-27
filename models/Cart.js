const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Book",
    required: true,
  },
  title: { type: String, required: true },
  price: { type: Number, min: 0 },
  salePrice: { type: Number, min: 0 },
  discount: { type: Number, min: 0 },
  coverImage: String,
  quantity: { type: Number, default: 1, min: 1 },
  bookUrl:{type:String},
  totalPages: { type:Number, default: 0},
  format: { type: String, enum: ['ebook', 'hardcopy'], default: 'ebook' },
});


const cartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema],
    totalPrice: { type: Number, default: 0 },
    totalItems: { type: Number, default: 0 },
    expireAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);
cartSchema.pre("save", function (next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  this.totalPrice = this.items.reduce((sum, item) => 
    sum + ((item.salePrice > 0 ? item.salePrice : item.price) * item.quantity), 
    0
  );

  // auto-delete if empty
  if (this.items.length === 0) {
    this.expireAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
  } else {
    this.expireAt = null;
  }
  next();
});

module.exports = mongoose.model("Cart", cartSchema);
