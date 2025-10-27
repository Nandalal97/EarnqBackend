const Category = require('../models/Category');

// ✅ Create Category (securely)
const createCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;
    const adminId = req.admin._id; // ✅ this comes from verifyAdminToken middleware

    if (!categoryName || !categoryName.en) {
      return res.status(400).json({ message: "English name is required in categoryName" });
    }

    const existing = await Category.findOne({ 'categoryName.en': categoryName.en });
    if (existing) {
      return res.status(409).json({ message: "Category already exists" });
    }

    const category = new Category({
      categoryName,
      createdBy: adminId
    });

    await category.save();
    res.status(201).json({ status: 1, msg: "Category added successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// ✅ Get All Categories
const getAllCategories = async (req, res) => {
  try {
    const allowedLangs = ['en', 'hi', 'ta', 'te', 'gu', 'kn', 'pa', 'bn', 'or', 'mr'];
    const lang = allowedLangs.includes(req.query.lang) ? req.query.lang : 'en';

    const categories = await Category.find();

    const response = categories
      .map(cat => ({
        _id: cat._id,
        name: cat.categoryName.get(lang) || cat.categoryName.get('en') || 'Unnamed'
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(response);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories", error: err.message });
  }
};


// single category
const getSingleCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({
      _id: category._id,
      categoryName: category.categoryName,
      createdBy: category.createdBy,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    });
  } catch (err) {
    res.status(500).json({
      message: 'Failed to fetch category',
      error: err.message
    });
  }
};

// edit category
const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryName } = req.body;

    if (!categoryName || typeof categoryName !== 'object') {
      return res.status(400).json({status:0, message: 'Invalid or missing categoryName object' });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { categoryName },
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({status:0, message: 'Category not found' });
    }

    res.json({
      status:1,
      message: 'Category updated successfully',
      category: updatedCategory,
    });
  } catch (err) {
    res.status(500).json({
      status:0,
      message: 'Server Error',
      error: err.message,
    });
  }
};


// delete category

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete category', error: err.message });
  }
};




module.exports = {
  createCategory,
  getAllCategories,
  editCategory,
  getSingleCategory,
  deleteCategory
};
