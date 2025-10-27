const express = require('express'); 
const router = express.Router();
const { newContact, getAllContacts, deleteContact } = require('../controllers/contactController');
const {newContactValidation} =require('../middleware/contactValidation')


router.post('/create', newContactValidation, newContact );

router.get('/allContact', getAllContacts);
router.delete('/delete/:id', deleteContact);

module.exports = router;
