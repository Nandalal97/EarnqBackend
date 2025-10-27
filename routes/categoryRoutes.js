const express = require('express');
const router = express.Router();
const { createCategory, getAllCategories, editCategory, getSingleCategory, deleteCategory } = require('../controllers/categoryController');
const { verifyAdminToken } = require('../middleware/verifyAdmin');


router.post('/add-category',verifyAdminToken, createCategory);
router.get('/categories', getAllCategories);
router.get('/categories/single/:id', getSingleCategory);
router.put('/categories/edit/:id',verifyAdminToken, editCategory);
router.delete('/categories/delete/:id', deleteCategory);

module.exports = router;

