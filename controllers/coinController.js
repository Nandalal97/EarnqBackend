const UserCoins = require('../models/UserCoins');
const PremiumCoins = require('../models/userPremiumCoin');

const getUserTotalCoins = async (req, res) => {
  const { userId } = req.params;
  try {
    // Get totalCoins from usercoins table
    const userCoin = await UserCoins.findOne({ userId });

    // Get totalPremiumCoins from premuimcoins table
    const premiumCoin = await PremiumCoins.findOne({ userId }).select('totalPremiumCoins');

    const totalUserCoins = (userCoin?.totalcoins || 0) + (premiumCoin?.totalPremiumCoins || 0);

    res.status(200).json({
      userId,
      quizCoins: userCoin?.totalcoins || 0,
      premiumCoins: premiumCoin?.totalPremiumCoins || 0,
      totalCoins: totalUserCoins
    });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
};

const reduceCoins = async (req, res) => {
  const { userId } = req.body;
  const coinToDeduct = req.body.coins || 100; // Default to 100 coins per question

  try {
    // Fetch current coins
    const premium = await PremiumCoins.findOne({ userId });
    const userCoin = await UserCoins.findOne({ userId });

    const premiumCoins = premium?.totalPremiumCoins || 0;
    const normalCoins = userCoin?.totalcoins || 0;

    // Step 1: Try deducting from premium coins first
    if (premiumCoins >= coinToDeduct) {
      premium.totalPremiumCoins -= coinToDeduct;
      await premium.save();

      return res.status(200).json({
        msg: 'Coins deducted from premium balance',
        remainingPremiumCoins: premium.totalPremiumCoins
      });
    }

    // Step 2: If premium coins are not enough, deduct from normal coins
    if (normalCoins >= coinToDeduct) {
      userCoin.totalcoins -= coinToDeduct;
      await userCoin.save();

      return res.status(200).json({
        msg: 'Coins deducted from regular balance',
        remainingCoins: userCoin.totalcoins
      });
    }

    // Step 3: If coins are too low
    return res.status(400).json({
      msg: 'Low coin balance. Upgrade to premium to continue.',
      coinRequirement: coinToDeduct,
      current: {
        premiumCoins,
        normalCoins
      }
    });

  } catch (error) {
    console.error('Error reducing coins:', error.message);
    return res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

module.exports = { getUserTotalCoins, reduceCoins };
