const express = require('express');
const router = express.Router();
const { createSubscriptionPlan, getAllSubscriptionPlans, updatesubscriptionPlan } = require('../controllers/subscriptionPlanController');
const { handleSubscription, getAllSubscription, getUserSubscriptionDetails } = require('../controllers/subscriptionController');
const verifyToken = require('../middleware/verifyToken');
const { verifyAdminToken } = require('../middleware/verifyAdmin');


// Add a new plan
router.post('/newPlan', createSubscriptionPlan );
// GET all plans
router.get('/getPlan', getAllSubscriptionPlans );
// Update plan
router.post('/updatePlan', updatesubscriptionPlan);


// subscription
router.post('/subscribe', verifyToken, handleSubscription);
router.get('/user/:userId', getUserSubscriptionDetails);

// for admin panel
router.get('/getAll',verifyAdminToken, getAllSubscription);
router.get('/:userId',verifyAdminToken, getUserSubscriptionDetails);



module.exports = router;
