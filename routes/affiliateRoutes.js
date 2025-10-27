const express = require('express');
const { registerAffiliate, getAffiliates, getAffiliateById,updateAffiliate, loginAffiliate } = require('../controllers/affiliateController');
const { getAffiliateDashboard } = require('../controllers/affiliateDashboardController');
const router = express.Router();


// POST /api/affiliate/register
router.post('/register', registerAffiliate);
router.post('/login', loginAffiliate);


// get all affiliators in admin dashbord
router.get('/dashboard/all', getAffiliates);

// get all affiliators in admin dashbord
router.get('/dashboard/single/:id', getAffiliateById);

// get all affiliators in admin dashbord
router.put('/update/:id', updateAffiliate);


// GET /api/affiliate/dashboard/:referralCode
router.get('/dashboard/:referralCode',getAffiliateDashboard);

module.exports = router;
