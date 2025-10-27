const SubscriptionPlan = require('../models/SubscriptionPlan');

const getAllSubscriptionPlans = async (req, res) => {
  const lang = req.query.lang || 'en';

  try {
    const plans = await SubscriptionPlan.find();

    const formattedPlans = plans.map(plan => ({
      planCode: plan.planCode,
      name: plan.name[lang] || plan.name['en'],
      basePrice: plan.basePrice,
      discounts: plan.discounts,
      buttonText: plan.buttonText[lang] || plan.buttonText['en'],
      // Send full feature objects (not translated string)
      features: plan.features.map(f => ({
        key: f.key,
        translations: f.translations
      }))
    }));

    res.json({ plans: formattedPlans });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};


// @desc Create new subscription plan
// @route POST /api/subscription-plans
const createSubscriptionPlan = async (req, res) => {
  try {
    const { planCode } = req.body;
    // Check if plan with same code exists
    const existingPlan = await SubscriptionPlan.findOne({ planCode });
    if (existingPlan) {
      return res.status(409).json({ error: 'Plan already exists with this code' });
    }
    const newPlan = new SubscriptionPlan(req.body);
    await newPlan.save();
    res.status(201).json({ message: 'Plan added', plan: newPlan });
  } catch (err) {
    res.status(400).json({ error: 'Invalid data', details: err.message });
  }
};

// Update subscription plan by planCode
const updatesubscriptionPlan = async (req, res) => {
  try {
    const { planCode } = req.params;
    const updateData = req.body;

    const updatedPlan = await SubscriptionPlan.findOneAndUpdate(
      { planCode },          // filter
      updateData,            // update fields
      { new: true }          // return updated document
    );

    if (!updatedPlan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({ message: 'Plan updated', plan: updatedPlan });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update plan', details: err.message });
  }
};


module.exports = {
createSubscriptionPlan,
updatesubscriptionPlan,
getAllSubscriptionPlans
};