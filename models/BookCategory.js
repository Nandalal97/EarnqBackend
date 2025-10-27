const mongoose = require("mongoose");

const bookCategorySchema = new mongoose.Schema({
  category_name: { type: String, required: true, unique: true }, // only one row per category
  description: { type: String },
  subcategories: [
    {
      name: { type: String},
      description: { type: String, default: null },
      icon_url: { type: String, default: null }
    }
  ]
});

module.exports = mongoose.model("BookCategory", bookCategorySchema);
