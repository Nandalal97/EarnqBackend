const ReferralWithdrawal = require("../../models/ReferralWithdrawal");
const User = require("../../models/User");

const requestWithdrawal = async (req, res) => {
  try {
    const { userId, amount, paymentMethod, upiId, accountNumber, ifscCode, bankName, fullName, phoneNumber } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Set the minimum withdrawal limit
    const minWithdrawal = 500;
    // Check if amount meets the minimum
    if (amount < minWithdrawal) {
      return res.status(400).json({ msg: `Minimum withdrawal is ₹${minWithdrawal}` });
    }
    // Check wallet balance
    if (amount > user.wallet) {
      return res.status(400).json({ msg: "Insufficient wallet balance" });
    }

    // Validate payment details
    if (paymentMethod === 'upi' && !upiId) {
      return res.status(400).json({ msg: "UPI ID is required" });
    }
    
    if (paymentMethod === 'bank' && (!accountNumber || !ifscCode || !bankName)) {
      return res.status(400).json({ msg: "Bank Name, account number and IFSC code are required" });
    }

    // ✅ Step 5: Create and save request
    const withdrawal = new ReferralWithdrawal({
      userId,
      amount,
      paymentMethod,
      upiId,
      accountNumber,
      ifscCode,
      bankName,
      fullName,
      phoneNumber,
      status: "pending"
    });

    await withdrawal.save();

    // ✅ Step 6: Deduct from wallet
    user.wallet -= amount;
    await user.save();

    res.status(201).json({ msg: "Withdrawal requested", withdrawal });
  } catch (err) {
    console.error("Withdrawal error:", err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

const updateWithdrawalStatus = async (req, res) => {
  try {
    const { withdrawalId, status, adminNote } = req.body;

    const allowedStatuses = ["approved", "rejected", "completed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ msg: "Invalid status value." });
    }

    const withdrawal = await ReferralWithdrawal.findById(withdrawalId);
    if (!withdrawal) return res.status(404).json({ msg: "Withdrawal not found" });

    // ✅ Rule: Only allow transition from 'pending' to approved/rejected
    if (status === "approved" && withdrawal.status !== "pending") {
      return res.status(400).json({ msg: "Only pending withdrawals can be approved" });
    }

    // ✅ Rule: Rejected → wallet refund
    if (status === "rejected" && withdrawal.status === "pending") {
      const user = await User.findById(withdrawal.userId);
      if (user) {
        user.wallet += withdrawal.amount;
        await user.save();
      }
    }

    // ✅ Rule: Only approved can go to completed
    if (status === "completed" && withdrawal.status !== "approved") {
      return res.status(400).json({ msg: "Only approved withdrawals can be marked as completed" });
    }

    withdrawal.status = status;
    withdrawal.adminNote = adminNote || "";

    if (status === "approved") withdrawal.approvedAt = new Date();
    if (status === "completed") withdrawal.completedAt = new Date(); // Add this field in schema

    await withdrawal.save();

    res.status(200).json({ msg: `Withdrawal ${status} successfully`, withdrawal });
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
};

// controllers/referralWithdrawalController.js


const getAllWithdrawals = async (req, res) => {
  try {
    const {
      status = "pending",
      limit = 20,
      nextId,
      months = 1,
    } = req.query;

    const filter = {
      status,
      createdAt: {
        $gte: new Date(
          new Date().setMonth(new Date().getMonth() - parseInt(months))
        ),
      },
    };

    if (nextId) {
      filter._id = { $lt: nextId }; // Only fetch older entries
    }

    const withdrawals = await ReferralWithdrawal.find(filter)
      .sort({ _id: -1 }) // Newest first
      .limit(parseInt(limit))
      .populate("userId", "first_name last_name email phone");

    res.status(200).json({
      withdrawals,
      nextId: withdrawals.length > 0 ? withdrawals[withdrawals.length - 1]._id : null,
      hasMore: withdrawals.length === parseInt(limit),
    });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};



module.exports ={requestWithdrawal, updateWithdrawalStatus,getAllWithdrawals}