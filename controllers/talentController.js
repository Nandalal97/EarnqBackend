const TalentBooking = require('../models/TalentBooking');
const TalentContest = require('../models/TalentContest');
const { giveTalentReferralCommission } = require('./referral/referralController');
const TalentQuestion = require('../models/TalentQuestion');
const moment = require("moment-timezone");
// Create new contest
const createTalentContest = async (req, res) => {
  try {
    const { name, description, startDate, endDate, entryFee, maxParticipantsPerSlot, totalSlots } = req.body;

    const contest = await TalentContest.create({
      name,
      description,
      startDate,
      endDate,
      entryFee,
      maxParticipantsPerSlot,
      totalSlots
    });

    res.status(201).json({ message: 'Contest created', contest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
// Get all contests
const getAllTalentContests = async (req, res) => {
  try {
    // 1️⃣ Get all active contests
    const contests = await TalentContest.find({ isActive: true }).sort({ startDate: -1 });

    if (contests.length === 0) {
      return res.status(404).json({ status: 1, message: 'No Contest Found' });
    }

    // 2️⃣ Get total questions grouped by contestId
    const questionCounts = await TalentQuestion.aggregate([
      { $group: { _id: "$contestId", totalQuestions: { $sum: 1 } } }
    ]);

    // 3️⃣ Create a quick lookup map
    const countMap = {};
    questionCounts.forEach(q => {
      countMap[q._id.toString()] = q.totalQuestions;
    });

    // 4️⃣ Add totalQuestions to each contest
    const contestsWithCounts = contests.map(contest => ({
      ...contest.toObject(),
      totalQuestions: countMap[contest._id.toString()] || 0
    }));

    // 5️⃣ Return result
    return res.json({ contests: contestsWithCounts });

  } catch (error) {
    console.error("Error fetching contests:", error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/talent/contest/:contestId/slot-count
const getSlotCount = async (req, res) => {
  const { contestId } = req.params;
  const { date } = req.query;

  try {
    // 1️⃣ Fetch contest details to get dynamic maxParticipantsPerSlot
    const contest = await TalentContest.findById(contestId).lean();
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    const maxPerSlot = contest.maxParticipantsPerSlot || 5000;
    const slots = ["Slot-1", "Slot-2", "Slot-3", "Slot-4", "Slot-5", "Slot-6"];

    // 2️⃣ Build query filter
    const query = { contestId };
    if (date) {
  const dayStart = moment.tz(date, "Asia/Kolkata").startOf("day").toDate();
  const dayEnd = moment.tz(date, "Asia/Kolkata").endOf("day").toDate();
  query.examDate = { $gte: dayStart, $lte: dayEnd };
}

    // 3️⃣ Count bookings for each slot
    const counts = await Promise.all(
      slots.map(slot =>
        TalentBooking.countDocuments({ ...query, slotId: slot })
      )
    );

    // 4️⃣ Build slotCounts response
    const slotCounts = {};
    slots.forEach((slot, i) => {
      slotCounts[slot] = {
        count: counts[i],
        isFull: counts[i] >= maxPerSlot 
      };
    });

    res.json({
      slotCounts,
      maxPerSlot // optional: send to frontend if you need to show it

    });
  } catch (err) {
    console.error("Error fetching slot counts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

function generatePassword() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!%*?";
  const length = Math.floor(Math.random() * (16 - 8 + 1)) + 8; // random length 8–16
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Register student for a contest
const talentRegisterStudent = async (req, res) => {
  try {
    const {userId, name, email, phone, gender, dob, examDate, contestId, slotId, referralCode } = req.body;
    // Check if already registered for the contest by email or phone
    const exists = await TalentBooking.findOne({
      contestId,
      $or: [{ email }, { phone }]
    });
    const contest = await TalentContest.findById(contestId).lean();
    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }
    const maxPerSlot = contest.maxParticipantsPerSlot || 500;


    if (exists) return res.status(400).json({ status: 0, message: 'Already registered for this contest' });
    // ✅ Check how many users are already registered for this slot
    const currentCount = await TalentBooking.countDocuments({ contestId, slotId });
    if (currentCount >= maxPerSlot) {
      return res.status(400).json({
        status: 0,
        message: "This slot is full. Please select another slot."
      });
    }
    // ✅ Generate auto password
    const password = generatePassword();
    // Create registration
    const booking = await TalentBooking.create({
      userId,
      name,
      email,
      phone,
      gender,
      dob,
      examDate,
      contestId,
      slotId,
      password,
      referralCode: referralCode || null
    });

    res.status(201).json({
      status: 1,
      message: 'Registration successful',
      booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 0, message: 'Server error' });
  }
};

// PUT or PATCH is better for updates
// const updateRegisterPaymentStatus = async (req, res) => {
//   try {
//     const { bookingId, orderId, isPaid,status } = req.body;

//     if (!bookingId) {
//       return res.status(400).json({ status: 0, message: "bookingId is required" });
//     }

    


//     // ✅ Find booking and update only these two fields
//     const updatedBooking = await TalentBooking.findByIdAndUpdate(
//       bookingId,
//       {
//         $set: {
//           ...(orderId !== undefined && { orderId }),   // update only if sent
//           ...(isPaid !== undefined && { isPaid }),    // update only if sent
//           ...(status !== undefined && { status }),    // update only if sent
//         }
//       },
//       { new: true } // return updated document
//     );

//     if (!updatedBooking) {
//       return res.status(404).json({ status: 0, message: "Booking not found" });
//     }

//     res.status(200).json({
//       status: 1,
//       message: "Payment info updated",
//       booking: updatedBooking
//     });
//   } catch (error) {
//     console.error("updatePaymentStatus error:", error);
//     res.status(500).json({ status: 0, message: "Server error" });
//   }
// };

const updateRegisterPaymentStatus = async (req, res) => {
  try {
    const { bookingId, orderId, isPaid, status } = req.body;

    if (!bookingId) {
      return res.status(400).json({ status: 0, message: "bookingId is required" });
    }

    // ✅ 1️⃣ Find the booking first
    const booking = await TalentBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ status: 0, message: "Booking not found" });
    }


    // ✅ 2️⃣ Update payment-related fields
    booking.orderId = orderId ?? booking.orderId;
    booking.isPaid = isPaid ?? booking.isPaid;
    booking.status = status ?? booking.status;

    await booking.save();

    // ✅ 3️⃣ If payment is confirmed, give referral commission
    if (booking.isPaid === true && booking.userId) {
      await giveTalentReferralCommission(booking.userId, booking.contestId);
      
    }

    res.status(200).json({
      status: 1,
      message: "Payment info updated",
      booking
    });

  } catch (error) {
    console.error("updatePaymentStatus error:", error);
    res.status(500).json({ status: 0, message: "Server error" });
  }
};


// Delete student from TalentBooking
const deleteTalentBookingStudent = async (req, res) => {
  try {
    const { bookingId } = req.params;

    // Check if booking exists
    const booking = await TalentBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        status: 0,
        message: "Student not found",
      });
    }

    // Delete the booking
    await TalentBooking.findByIdAndDelete(bookingId);

    res.status(200).json({
      status: 1,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete Student Error:", error);
    res.status(500).json({
      status: 0,
      message: "Server error",
    });
  }
};

module.exports = {
  createTalentContest,
  getAllTalentContests,
  talentRegisterStudent,
  updateRegisterPaymentStatus,
  deleteTalentBookingStudent,
  getSlotCount
}
