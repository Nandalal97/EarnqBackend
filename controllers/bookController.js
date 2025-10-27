const Book = require('../models/Book');
const BookCategory =require('../models/BookCategory')
const Order = require("../models/orderSchema");
const mongoose = require('mongoose');
const createBook = async (req, res) => {
  try {
    // Create a new book
    const newBook = new Book(req.body);
    // Save book to database
    const savedBook = await newBook.save();
    // Send successful response
    return res.status(201).json({success: true,status:1, message: 'Book created successfully'});
  } catch (error) {
    //validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
           status:0,
        message: 'Validation failed',
        errors: Object.values(error.errors).map((err) => err.message),
      });
    }

    //other server errors
    console.error('Create Book Error:', error);
    return res.status(500).json({
      success: false,
         status:0,
      message: 'Internal Server Error',
    });
  }
};

// Get all books with pagination and optional filters
const getBooks = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, category, language, random } = req.query;
    page = Number(page);
    limit = Number(limit);
    const query = {};
    if (search) query.$text = { $search: search };
    if (category) query.category = category;
    if (language) query.language = language;

    const total = await Book.countDocuments(query);

    let books;
    if (random === "true") {
      // Get random books (but still paginated)
      const sampleSize = Math.min(total, limit * page);
      const allBooks = await Book.aggregate([
        { $match: query },
        { $sample: { size: sampleSize } }
      ]);
      books = allBooks.slice((page - 1) * limit, page * limit);
    } else {
      // Normal paginated fetch (sorted by newest)
      books = await Book.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
    }
    res.status(200).json({
      success: true,
      total,
      currentPage: page,
      pages: Math.ceil(total / limit),
      books,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Controller: getBooks for Admin Dashboard
const getallBooks = async (req, res) => {
  try {
    let { page = 1, limit = 10, search, category, language } = req.query;

    page = Number(page);
    limit = Number(limit);

    const query = {};

    // Search (case-insensitive across multiple fields)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { author: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (category) query.category = category;
    if (language) query.bookLanguage = language;  // ✅ fixed

    const total = await Book.countDocuments(query);
    const books = await Book.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total,
      currentPage: page,
      pages: Math.ceil(total / limit),
      books,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Get single book by ID
const getBookById = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book)
      return res.status(404).json({status:0, success: false, message: 'Book not found' });
    res.status(200).json({ success: true,status:1, book });
  } catch (error) {
    res.status(500).json({status:0, success: false, message: error.message });
  }
};

// Update book by ID
const updateBook = async (req, res) => {
  try {
    const updatedBook = await Book.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updatedBook)
      return res.status(404).json({status:0, success: false, message: 'Book not found' });
    res.status(200).json({status:1, success: true, message:'Book Update Successful'});
  } catch (error) {
    res.status(500).json({status:0, success: false, message: error.message });
  }
};

// Delete book by ID
const deleteBook = async (req, res) => {
  try {
    const deletedBook = await Book.findByIdAndDelete(req.params.id);
    if (!deletedBook)
      return res.status(404).json({status:0, success: false, message: 'Book not found' });
    res.status(200).json({status:1, success: true, message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({status:0, success: false, message: error.message });
  }
};

// Book Category 

 const createCategory = async (req, res) => {
try {
    const { category_name, description, subcategories } = req.body;
    // Check if category exists
    let category = await BookCategory.findOne({ category_name });
    if (category) {
      // ✅ If category exists → update (push new subcategories)
      category.subcategories.push(...subcategories);
      await category.save();
      return res.json({ success: true, message: "Category updated", data: category });
    } else {
      // ✅ If category does not exist → create new
      category = new BookCategory({ category_name, description, subcategories });
      await category.save();
      return res.json({ success: true, message: "Category created SUccessful", data: category });
    }
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await BookCategory.find(); // fetch all categories
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const editCategory = async (req, res) => {
  try {
    const { categoryId } = req.params; // category _id from URL
    const { category_name, description, subcategories } = req.body;

    // Find category by ID
    const category = await BookCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    // Update main category fields
    if (category_name) category.category_name = category_name;
    if (description) category.description = description;

    // Update subcategories if provided
    if (subcategories && Array.isArray(subcategories)) {
      category.subcategories = subcategories; // replace all subcategories
    }

    await category.save();

    res.json({ success: true, message: "Category updated successfully", data: category });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "Category name already exists" });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};
// delete subcategory
const deleteSubCategory= async (req, res) => {
  const { categoryId, subId } = req.params;
  try {
    const category = await BookCategory.findById(categoryId);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    // Remove the subcategory with matching _id
    category.subcategories = category.subcategories.filter(sub => sub._id.toString() !== subId);
    await category.save();

    res.json({ success: true, message: "Subcategory deleted", data: category });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// delete category
const deleteBookCategory= async (req, res) => {
  const { categoryId } = req.params;

  try {
    const category = await BookCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    await BookCategory.findByIdAndDelete(categoryId);
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

//Get Category by ID or Name
const singleCategory= async (req, res) => {
  try {
    const { id } = req.params;

    // Check if id is ObjectId or category_name
    let category;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      // Fetch by _id
      category = await BookCategory.findById(id);
    } else {
      // Fetch by category_name
      category = await BookCategory.findOne({ category_name: id });
    }

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


// GET /orders/all?search=&status=&type=&from=&to=&page=1&limit=10
const getOrderBooks = async (req, res) => {
  try {
    const { search, orderStatus, type, from, to, page = 1, limit = 10 } = req.query;

    let query = {};

    // Filter by status
    if (orderStatus && orderStatus !== "all") query.orderStatus = orderStatus;

    // Filter by type
    if (type && type !== "all") {
      const t = type.toLowerCase();
      if (t === "ebook" || t === "e-book") query["items.format"] = "ebook";
      else if (t === "hardcopy" || t === "hard copy") query["items.format"] = "hardcopy";
    }

    // Filter by date
    if (from || to) query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);

    // Search by orderId, userId, or book title
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: "i" } },
        { userId: { $regex: search, $options: "i" } },
        { "items.title": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      status: 1,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      orders,
    });
  } catch (err) {
    res.status(500).json({ status: 0, error: err.message });
  }
};


const getOrderDetailsById = async (req, res) => {
    try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: 0, message: "Order ID (_id) is required" });
    }

    // Populate user and books
    const order = await Order.findById(id)
      .populate("userId", "first_name middle_name last_name email")
      .populate("items.bookId");

    if (!order) {
      return res.status(404).json({ status: 0, message: "Order not found" });
    }

    // Convert to plain object so we can reshape it
    const orderObj = order.toObject();

    // Move populated user data into `userData`
    const userData = orderObj.userId
      ? {
          _id: orderObj.userId._id,
          first_name: orderObj.userId.first_name,
          middle_name: orderObj.userId.middle_name,
          last_name: orderObj.userId.last_name,
          email: orderObj.userId.email,
        }
      : null;

    // Delete original userId if you don’t want to show it
    delete orderObj.userId;

    res.status(200).json({
      status: 1,
      order: {
        ...orderObj,
        userData, // 👈 attach here
      },
    });
  } catch (err) {
    res.status(500).json({ status: 0, error: err.message });
  }
};
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body; // <-- updated field

    if (!id) {
      return res.status(400).json({ status: 0, message: "Order ID (_id) is required" });
    }

    if (!orderStatus || !['Pending','Process','Completed','Rejected', 'Failed'].includes(orderStatus)) {
      return res.status(400).json({ status: 0, message: "Valid orderStatus is required" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ status: 0, message: "Order not found" });
    }

    // Update the new field
    order.orderStatus = orderStatus;
    await order.save();

    res.status(200).json({
      status: 1,
      message: `Order status updated to ${orderStatus}`,
      updatedOrderStatus: orderStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 0, message: err.message });
  }
};


module.exports = {
  createBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  getallBooks,
  createCategory,
  getAllCategories,
  editCategory,
  deleteSubCategory,
  deleteBookCategory,
  singleCategory,
  getOrderBooks,
  getOrderDetailsById,
  updateOrderStatus
};
