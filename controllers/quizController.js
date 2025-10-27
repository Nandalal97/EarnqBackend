const UserCoins = require('../models/UserCoins');

const submitQuiz = async (req, res) => {
  const { userId, correct, wrong } = req.body;

  if (!userId || correct == null || wrong == null) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  const earned = correct;                     // +1 per correct
  const lost = Math.floor(wrong / 3);         // -1 per 3 wrong
  const net = earned - lost;

  let coinData = await UserCoins.findOne({ userId });
  if (!coinData) {
    coinData = new UserCoins({ userId });
  }

  coinData.totalcoins = Math.max(0, coinData.totalcoins + net); // prevent negative
  coinData.totalEarned += earned;
  coinData.totalLost += lost;
  coinData.correctAnswers = (coinData.correctAnswers || 0) + correct;
  coinData.wrongAnswers = (coinData.wrongAnswers || 0) + wrong;

  await coinData.save();

  res.json({
    message: 'Coins updated successfully',
    correct,
    wrong,
    earned,
    lost,
    finalCoins: coinData.totalcoins,
    totalCorrectAnswers: coinData.correctAnswers,
    totalWrongAnswers: coinData.wrongAnswers
  });
};

module.exports = { submitQuiz };
