const express = require('express');
const router = express.Router();
const {createBook, getBooks, getBookById, updateBook,  deleteBook, getallBooks, createCategory, 
    getAllCategories, editCategory, deleteSubCategory, deleteBookCategory,
    singleCategory,
    getOrderBooks} = require('../controllers/bookController');
const { newBookValidation } = require('../middleware/newBookValidation');
const { addToCart, removeFromCart, getCartItems , } = require('../controllers/cartController');
const { placeOrder, getUserOrders, readBook, bookdetails } = require('../controllers/Checkout');
const { makePayment, getPaymentById, getPaymentsByUser, getDailyReport } = require('../controllers/bookPaymentControllers');

//book order details for admin panel
router.get("/orders/all", getOrderBooks);

// boook category 
router.post('/category/new', createCategory);
router.get('/category/all', getAllCategories);
router.put("/category/:categoryId", editCategory);
router.delete("/category/:categoryId/subcategory/:subId", deleteSubCategory);
router.delete("/category/:categoryId", deleteBookCategory);
router.get("/category/:id", singleCategory)

// For fronend api
// Routes
router.post('/new', newBookValidation, createBook);
router.get('/all', getBooks);
router.get("/allbooks", getallBooks); // for admin dashboard



// POST /api/cart/add
router.post('/cart/add', addToCart);
router.get('/cart/:userId', getCartItems);
router.delete("/cart/delete", removeFromCart);

// Book Order
router.post("/order/checkout", placeOrder);
router.get('/orders/:userId', getUserOrders);
router.get("/:userId/:bookId/page/:pageNo", readBook);
router.get("/:bookId/details", bookdetails)

// payment
router.post("/order/payment", makePayment);
// Get payment by paymentId
router.get("/order/:paymentId", getPaymentById);
// Get payments by user
router.get("/order/user/:userId",getPaymentsByUser);


// for admin dashboard
// Daily revenue report
router.get("/order/report/daily", getDailyReport);


router.get('/:id', getBookById);
router.put('/:id', newBookValidation, updateBook);
router.delete('/:id', deleteBook);

module.exports = router;
