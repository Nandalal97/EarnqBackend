const Admin = require('../../models/admin/AdminModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Otp = require('../../models/otpModel');
const sendEmail = require('../../utils/sendEmail');

const JWT_SECRET = process.env.JWT_SECRET;

// Register (Superadmin only)
const registerAdmin = async (req, res) => {
  const { name, email, phone, password,gender,address,aadharNo,panCard, role, bankAccount, 
    BankName,ifscCode,profileImage,aadharUrl,panCardUrl, createdBy } = req.body;

  try {
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ msg: 'Admin already exists' });
    const existsNumber= await Admin.findOne({ phone });
    if (existsNumber) return res.status(400).json({status:0, msg: 'Admin Number already exists' });

    const hashed = await bcrypt.hash(password, 10);

    const newAdmin = new Admin({ name, email, phone, password: hashed, gender,address,aadharNo,panCard, role, bankAccount, 
    BankName,ifscCode,profileImage,aadharUrl,panCardUrl,createdBy });
    await newAdmin.save();

    res.status(201).json({ status:1, msg: 'Admin created successfully' });
  } catch (err) {
    res.status(500).json({status:0, msg: 'Error creating admin' });
  }
};

// GET all admin users
const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password'); // exclude password
    res.status(200).json({ status: 1, admins });
  } catch (error) {
    res.status(500).json({ status: 0, msg: 'Error fetching admins' });
  }
};


const getSingleAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findById(id).select('-password'); // Exclude password

    if (!admin) {
      return res.status(404).json({ status: 0, msg: 'Admin not found' });
    }

    res.status(200).json({ status: 1, admin });
  } catch (error) {
    res.status(500).json({ status: 0, msg: 'Error fetching admin' });
  }
};

const updateAdmin = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // Prevent updating email/phone to existing values of another admin
    const existingAdmin = await Admin.findOne({ email: updateData.email, _id: { $ne: id } });
    if (existingAdmin) return res.status(400).json({ status: 0, msg: 'Email already in use' });

    const existingPhone = await Admin.findOne({ phone: updateData.phone, _id: { $ne: id } });
    if (existingPhone) return res.status(400).json({ status: 0, msg: 'Phone number already in use' });

    // Optional: if password is provided, hash it
    if (updateData.password) {
      const bcrypt = require('bcrypt');
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const updatedAdmin = await Admin.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedAdmin) {
      return res.status(404).json({ status: 0, msg: 'Admin not found' });
    }

    res.status(200).json({ status: 1, msg: 'Admin updated successfully', admin: updatedAdmin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 0, msg: 'Error updating admin' });
  }
};


const deleteAdmin = async (req, res) => {
  const { id } = req.params;

  try {
    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({ status: 0, msg: 'Admin not found' });
    }

    await Admin.findByIdAndDelete(id);

    res.status(200).json({ status: 1, msg: 'Admin deleted successfully' });
  } catch (err) {
    console.error('Delete Admin Error:', err);
    res.status(500).json({ status: 0, msg: 'Error deleting admin' });
  }
};


// Login
const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ status:0, msg: 'Admin not found' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(400).json({status:0, msg: 'Invalid credentials' });

    const token = jwt.sign({ adminId: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '1d' });


    res.json({
        status:1,
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email,phone: admin.phone, role: admin.role },
      msg:'Login successful'
      
    });
    
  } catch {
    res.status(500).json({ message: 'Login error' });
  }
};

// Step 1: Request OTP
const sendOTP = async (req, res) => {
  const { email } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(404).json({ message: 'Admin not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60000); // 5 mins
  await Otp.findOneAndUpdate({ email }, { otp, expiresAt }, { upsert: true });

  const html = `<div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
      <h3 style="color: #333;">Your OTP is: <span style="color: #0056b3;">${otp}</span></h3>
      <p style="color: #555;">Please use this OTP to complete your login. It will expire in <strong>5 minutes</strong>.</p>
      <br/>
      <p style="font-size: 12px; color: #999;">If you did not request this OTP, please ignore this email.</p>
    </div>
  `;
  await sendEmail(email, 'Admin Login OTP', html);
  res.json({ message: 'OTP sent to email' });
};


// Step 2: Verify OTP
const otpVerify= async (req, res) => {
  const { email, otp } = req.body;
  const record = await Otp.findOne({ email });
  if (!record || record.otp !== otp || record.expiresAt < new Date()) {
    return res.status(400).json({ msg: 'Invalid or expired OTP' });
  }

  const admin = await Admin.findOne({ email });
  const token = jwt.sign({ adminId: admin._id }, JWT_SECRET, { expiresIn: '24h' });
  await Otp.deleteOne({ email }); // Remove used OTP

  res.json({ status:1, msg:'Otp Verify', token, role: admin.role });
};


module.exports={registerAdmin, loginAdmin, sendOTP,otpVerify, getAllAdmins,getSingleAdmin, updateAdmin,deleteAdmin }
