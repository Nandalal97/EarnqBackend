const express = require('express');
const router = express.Router();
const { createSubject, getSubjectsGroupedByCategory, getAllSubjectsWithCategory, editSubject, deleteSubject, getSingleSubject } = require('../controllers/subjectController');

router.post('/add-subject', createSubject);
router.get('/', getSubjectsGroupedByCategory);

router.get('/single-subject/:id', getSingleSubject);
router.put('/single-subject/edit/:id', editSubject);
router.delete('/single-subject/delete/:id', deleteSubject);

router.get('/all', getAllSubjectsWithCategory);

module.exports = router;