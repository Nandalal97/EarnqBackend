const User = require('../models/User');
const bcrypt = require("bcryptjs");

const getAllUsers = async (req, res) => {
  try {
    const { search = '', limit = 10, lastId } = req.query;
    const queryLimit = Math.min(parseInt(limit), 100);
    const filter = {};

    // Cursor Pagination
    if (lastId) {
      filter._id = { $lt: lastId };
    }

    // Search: Text filter (name, email, phone, state)
    if (search && !/^\d{4}(-\d{2}){0,2}$/.test(search)) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { first_name: regex },
        { last_name: regex },
        { email: regex },
        { phone_number: regex },
        { state: regex },
      ];
    }

    // Search: Date, Month-Year, or Year
    else if (/^\d{4}-\d{2}-\d{2}$/.test(search)) {
      const date = new Date(search);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      filter.createdAt = { $gte: date, $lt: nextDate };
    } else if (/^\d{4}-\d{2}$/.test(search)) {
      const [year, month] = search.split('-');
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.createdAt = { $gte: start, $lte: end };
    } else if (/^\d{4}$/.test(search)) {
      const start = new Date(search, 0, 1);
      const end = new Date(search, 11, 31, 23, 59, 59);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const users = await User.find(filter)
      .sort({ _id: -1 })
      .limit(queryLimit)
      .select('-password')
      .lean();

    const hasMore = users.length === queryLimit;
    const nextLastId = hasMore ? users[users.length - 1]._id : null;

    const totalUsers = await User.countDocuments(filter); // ✅ ADD THIS

    res.json({ users, nextLastId, hasMore, totalUsers }); // ✅ RETURN IT
  } catch (err) {
    console.error('User fetch error:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// single User Data
const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Optional: validate ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId).select('-password'); // exclude password

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserById = async (req, res) => {
   try {
    const { id } = req.params;
    const { first_name, middle_name, last_name, dob, gender, address,pin_code,state,language } = req.body;
    if (!first_name) {
      return res.status(404).json({ msg: 'Fist name require',status:0 });
    }
    if (!pin_code) {
      return res.status(404).json({ msg: 'Pin Code require',status:0 });
    }
    const updatedData = { first_name, middle_name, last_name, dob, gender, address,pin_code,state,language };
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updatedData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ msg: 'User not found',status:0 });
    }

    res.json({ msg: 'Profile updated successfully!', status:1});
  } catch (err) {
    res.status(500).json({ msg: 'Error', error: err.message });
  }
};

const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const { userId } = req.params; // using param as you want

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ status: 0, msg: 'Old and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ status: 0, msg: 'New password must be at least 6 characters.' });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ status: 0, msg: 'User not found.' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ status: 0, msg: 'Old password is incorrect.' });

    if (oldPassword === newPassword) {
      return res.status(400).json({ status: 0, msg: 'New password cannot be same as old password.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    res.status(200).json({ status: 1, msg: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ status: 0, msg: 'Server error', error: err.message });
  }
};

module.exports = { changePassword };
// for dashbord home page 
const getLatestUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 }) // latest first
      .limit(10)
      .select('first_name middle_name last_name email phone_number gender createdAt') // select only required fields
      .lean();

    res.status(200).json({ success: true, data: users });
  } catch (err) {
    console.error('Dashboard users fetch error:', err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const getUserGenderStats = async (req, res) => {
  try {
    const genderStats = await User.aggregate([
      {
        $group: {
          _id: "$gender",
          count: { $sum: 1 }
        }
      }
    ]);

    const formatted = genderStats.map(item => ({
      gender: item._id || "Unknown",
      value: item.count
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    console.error("Gender stats error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getMonthlyUserStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();

    const data = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(`${currentYear}-01-01T00:00:00Z`),
            $lte: new Date(`${currentYear}-12-31T23:59:59Z`)
          }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          month: "$_id",
          count: 1,
          _id: 0
        }
      },
      { $sort: { month: 1 } }
    ]);

    const result = Array.from({ length: 12 }, (_, i) => {
      const found = data.find(d => d.month === i + 1);
      return { month: i + 1, count: found ? found.count : 0 };
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
const getStateWiseUserStats = async (req, res) => {
  try {
    const data = await User.aggregate([
      {
        $group: {
          _id: "$state", // Group by state field in User model
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          state: "$_id",
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 } // Optional: sort by highest user count
      }
    ]);

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};



module.exports = { 
  getAllUsers,
  getUserById,
  updateUserById,
  getLatestUsers,
  getUserGenderStats,
  getMonthlyUserStats,
  getStateWiseUserStats,
  changePassword
};
