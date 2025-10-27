const Affiliate = require('../models/AffiliateUser');
const Referral = require('../models/Referral');
const TalentBooking = require('../models/TalentBooking');
const TalentPayment = require('../models/TalentPayments');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

// Register new affiliate
const registerAffiliate = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      promotionPlatforms,   // array of objects [{ platform, url }]
      bankAccountNumber,
      ifscCode,
      bankName,
      upiId,
      panCardNo,
      panCardNoUrl,
      aadharCardNo,
      aadharCardNoUrl
      
    } = req.body;

    // ✅ Check if email / phone / PAN / Aadhar already exists
    const existingUser = await Affiliate.findOne({
      $or: [
        { email },
        { phone },
        { panCardNo },
        { aadharCardNo }
      ]
    });

    if (existingUser) {
      // Determine which field is already taken for better message
      let conflictField = 'User';
      if (existingUser.email === email) conflictField = 'Email';
      else if (existingUser.phone === phone) conflictField = 'Phone number';
      else if (existingUser.panCardNo === panCardNo) conflictField = 'PAN card';
      else if (existingUser.aadharCardNo === aadharCardNo) conflictField = 'Aadhar card';

      return res.status(400).json({ message: `${conflictField} already registered as affiliate` });
    }

    // ✅ Generate a unique referral code
    const generateUniqueReferralCode = async () => {
      let code;
      let exists = true;

      while (exists) {
        code = 'AFF' + Math.floor(100000 + Math.random() * 900000);
        exists = await Affiliate.findOne({ referralCode: code });
      }

      return code;
    };
    const referralCode = await generateUniqueReferralCode();

    // ✅ Create affiliate
    const affiliate = await Affiliate.create({
      name,
      email,
      phone,
      promotionPlatforms,   // directly save objects {platform, url}
      referralCode,
      bankAccountNumber,
      ifscCode,
      bankName,
      upiId,
      panCardNo,
      panCardNoUrl,
      aadharCardNo,
      aadharCardNoUrl
    });

    return res.status(201).json({
      message: 'Affiliate registered successfully',
      affiliate
    });

  } catch (error) {
    console.error('Affiliate registration error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// login
const loginAffiliate = async (req, res) => {
  const { email,password} = req.body;
  try {
    const Affiliator = await Affiliate.findOne({ email });
    if (!Affiliator) return res.status(400).json({ status:0, msg: 'not found' });


    const match = await bcrypt.compare(password, Affiliator.password);
    if (!match) return res.status(400).json({status:0, msg: 'Invalid credentials' });

    const token = jwt.sign({ affiliatorId: Affiliator._id, name:Affiliator.name, email:Affiliator.email, referralCode: Affiliator.referralCode }, JWT_SECRET, { expiresIn: '1d' });


    res.json({
        status:1,
      token,
      affiliator: {Id: Affiliator._id, name:Affiliator.name, email:Affiliator.email, referralCode: Affiliator.referralCode },
      msg:'Login successful'
      
    });
    
  } catch {
    res.status(500).json({ message: 'Login error' });
  }
};

// get all affiliter list
const getAffiliates = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", status = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const query = {};

    // 🔎 Search by name/email/aadhar/pan
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i"); // case-insensitive
      query.$or = [
        { name: regex },
        { email: regex },
        { aadharCardNo: regex },
        { panCardNo: regex },
      ];
    }

    // ✅ Filter by status if provided (pending/approved/rejected)
    if (status && ["Pending", "Approved", "Rejected"].includes(status)) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [affiliates, total] = await Promise.all([
      Affiliate.find(query)
        .select("_id name email phone referralCode status") 
        .sort({ createdAt: -1 }) // latest first
        .skip(skip)
        .limit(limit),
      Affiliate.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      affiliates,
    });
  } catch (error) {
    console.error("Get Affiliates Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

//  single affilite 
const getAffiliateById = async (req, res) => {
  try {
    const { id } = req.params;

    const affiliate = await Affiliate.findById(id).lean(); // lean() for faster query

    if (!affiliate) {
      return res.status(404).json({ success: false, message: "Affiliate not found" });
    }

    res.status(200).json({status:true, success: true, affiliate });
  } catch (error) {
    console.error("Get Affiliate by ID Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /api/affiliates/:id
const updateAffiliate = async (req, res) => {
  try {
    const { id } = req.params; // affiliate _id from route
    const updates = req.body;  // fields to update

    // ✅ Optional: Prevent updating restricted fields
    const disallowedFields = ["referralCode", "_id", "createdAt"];
    disallowedFields.forEach((field) => delete updates[field]);

    // ✅ If email/phone/pan/aadhar provided, ensure uniqueness
    if (updates.email || updates.phone || updates.panCardNo || updates.aadharCardNo) {
      const conflict = await Affiliate.findOne({
        _id: { $ne: id }, // exclude current record
        $or: [
          updates.email ? { email: updates.email } : null,
          updates.phone ? { phone: updates.phone } : null,
          updates.panCardNo ? { panCardNo: updates.panCardNo } : null,
          updates.aadharCardNo ? { aadharCardNo: updates.aadharCardNo } : null
        ].filter(Boolean)
      });

      if (conflict) {
        let conflictField = "User";
        if (conflict.email === updates.email) conflictField = "Email";
        else if (conflict.phone === updates.phone) conflictField = "Phone number";
        else if (conflict.panCardNo === updates.panCardNo) conflictField = "PAN card";
        else if (conflict.aadharCardNo === updates.aadharCardNo) conflictField = "Aadhar card";
        return res.status(400).json({ message: `${conflictField} already exists` });
      }
    }

    // ✅ Update and return the updated document
    const affiliate = await Affiliate.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!affiliate) {
      return res.status(404).json({ message: "Affiliate not found" });
    }

    return res.status(200).json({
      message: "Affiliate updated successfully",
      affiliate
    });

  } catch (error) {
    console.error("Affiliate update error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};



// Call this after payment success
const createReferralIfAny = async (registrationId, paymentId) => {
  const booking = await TalentBooking.findById(registrationId);
  if (!booking || !booking.referralCode) return; // no referral code

  const affiliate = await Affiliate.findOne({ referralCode: booking.referralCode });
  if (!affiliate) return; // invalid referral code

  // Prevent duplicate commission
  const exists = await Referral.findOne({ referrerUserId: affiliate._id, referredRegistrationId: registrationId });
  if (exists) return;

  // Create referral commission
  await Referral.create({
    referrerUserId: affiliate._id,
    referredRegistrationId: registrationId,
    paymentId,
    commissionAmount: 10, // per student
    payoutStatus: 'pending'
  });

  // Update affiliate totals
  affiliate.totalReferrals += 1;
  affiliate.totalCommissionEarned += 10;
  await affiliate.save();
};
module.exports={
    registerAffiliate,
    createReferralIfAny,
    getAffiliates,
    getAffiliateById,
    updateAffiliate,
    loginAffiliate
}