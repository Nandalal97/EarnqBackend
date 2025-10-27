const Contact = require('../models/contactModel');

// Create a new contact message
const newContact = async (req, res) => {
  try {
    const { name, number, email, subject, message } = req.body;

    const newContact = new Contact({
      name,
      number,
      email,
      subject,
      message
    });

    const savedContact = await newContact.save();

    res.status(201).json({ success: true, status:1, msg:"Request Successfully send", data:savedContact});

  } catch (error) {
    res.status(500).json({ success: false,status:0,msg:"Request Fail", error: error.message });
  }
};

// Get all contact messages
const getAllContacts = async (req, res) => {
  try {
    const { page = 1, limit = 10, date, month, year } = req.query;

    const filter = {};

    // Handle date filter (YYYY-MM-DD)
    if (date) {
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: dayStart, $lte: dayEnd };
    }

    // Handle month filter (MM or MM-YYYY)
    if (month && !date) {
      const currentYear = year || new Date().getFullYear();
      const monthStart = new Date(`${currentYear}-${month}-01`);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);
      monthEnd.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: monthStart, $lte: monthEnd };
    }

    // Handle year-only filter
    if (year && !month && !date) {
      const yearStart = new Date(`${year}-01-01`);
      const yearEnd = new Date(`${year}-12-31T23:59:59.999Z`);
      filter.createdAt = { $gte: yearStart, $lte: yearEnd };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [contacts, totalCount] = await Promise.all([
      Contact.find(filter)
        .populate('userId', 'first_name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),

      Contact.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      status: 1,
      data: contacts,
      totalPages,
      currentPage: parseInt(page),
      totalCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, status: 0, error: error.message });
  }
};

// Delete a contact message by ID
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    await Contact.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// for admin dashbord home 

const getLatestContactsForDashboard = async (req, res) => {
  try {
    const contacts = await Contact.find()
      .populate('userId', 'first_name email')
      .sort({ createdAt: -1 }) // latest first
      .limit(10)
      .lean();

    res.status(200).json({
      success: true,
      data: contacts,
    });
  } catch (error) {
    console.error('Dashboard contacts error:', error.message);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};



module.exports={
    newContact,
    getAllContacts,
    deleteContact,
    getLatestContactsForDashboard
}