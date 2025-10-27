const JWT = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require('../models/User');
const crypto = require("crypto");
const disposableDomains = require('disposable-email-domains');
// const verifyRecaptcha = require('../utils/verifyRecaptcha');
const Session = require("../models/Sessions");
const ReferralSettings = require("../models/ReferralSettings");
const sendEmail = require('../utils/sendEmail');
const { normalizeIp } = require('../utils/ip');

// ---------------- Allowed / Disabled email domains ----------------
const disableDomains = [
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'trashmail.com',
  'yopmail.com',
  'temp-mail.org',
  'tempmail.net',
  'maildrop.cc',
  'dispostable.com',
  'getnada.com',
  'mintemail.com',
  'mailnesia.com',
  'anonymbox.com',
  'moakt.com',
  'spamgourmet.com',
  'spam4.me',
  'throwawaymail.com',
  'tempinbox.com',
  'fakeinbox.com',
  'spamdecoy.net',
  'sharklasers.com',
  'mailcatch.com',
  'emailondeck.com',
  'fakemailgenerator.com',
  'mail-temp.com',
  'disposablemail.com',
  'mytemp.email',
  'tempail.com',
  'trashmail.net',
  'ihnpo.com',
  'spambox.us',
  'nespf.com',
  'wegwerfemail.de',
  'mail-temporaire.fr',
  'mailtothis.com',
  'tempmailaddress.com',
  'emailtemporanea.com',
  'mailexpire.com',
  'tempemail.co',
  'trashmail.me',
  'yepmail.net',
  'getairmail.com',
  'guerrillamailblock.com',
  'mailcatcher.me',
  'temp-mail.io',
  'meltmail.com',
  'tempmailbox.com',
  'mail-temporaire.com',
  'tempomail.fr',
  'tempinbox.xyz',
  'jetable.org',
  'spam4.me',
  'easytrashmail.com',
  'spamherelots.com',
  'incognitomail.org',
  'getmailspring.com',
  'trashmail.ws',
  'tempemail.net',
  'tempomail.net',
  'mail-temp.com',
  'throwawayemailaddress.com',
  'mytrashmail.com',
  'trash-mail.com',
  'tempmail.org',
  'mytempemail.com',
  'temp-mail.com',
  'fakeinbox.xyz',
  'spambog.com',
  'binkmail.com',
  'disposable-email.org',
  'mvrht.com',
  'tempail.net',
  'tempmailbox.xyz',
  'mailforspam.com',
  'tempemail.xyz',
  'mailtemp.net',
  'spamfree24.org',
  'temp-mail.de',
  'ishense.com',
  'burnermail.io',
  'throwawayemail.net',
  'tempemailbox.com',
  'spamdecoy.com',
  'trashmail.me',
  'temp-mail.ru',
  'spambox.xyz',
  'guerrillamail.net',
  'temp-mail.io',
];

const allowedDomains = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'icloud.com',
  'protonmail.com',
  'zoho.com',
  'earnq.in'
];

function getEmailDomain(email) {
  return email.split('@')[1].toLowerCase().trim();
}

const MAX_DEVICE_REGISTRATION = 3;

// create refer code 
async function generateUniqueReferralCode() {
  let code;
  let exists = true;
  while (exists) {
    const randomPart = Math.random().toString(36).substring(2, 8); // 6 chars
    const timePart = Date.now().toString(36).slice(-6); // 6 chars
    code = (randomPart + timePart).toLowerCase(); // 12 chars
    // check in DB
    exists = await User.exists({ referralCode: code });
  }
  return code;
}


const register = async (req, res) => {
  try {
    const { first_name, middle_name, last_name, phone_number, email, dob, gender, address, pin_code,
      state, language, password, deviceId, referredBy } = req.body;

    // ---------------- IP normalization ----------------
    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
    const clientIp = rawIp ? normalizeIp(rawIp) : null;
    if (!clientIp) return res.status(400).json({ msg: 'Could not determine client IP', status: 0 });

    // ---------------- reCAPTCHA check ----------------
    //  const isHuman = await verifyRecaptcha(recaptchaToken);
    //   if (!isHuman) {
    //     return res.status(400).json({ msg: 'reCAPTCHA failed. Please try again.', status: 0 });
    // }

    // ---------------- Email validation ----------------
    const domain = getEmailDomain(email);
    if (!domain) return res.status(400).json({ msg: 'Invalid email', status: 0 });
    if (disableDomains.includes(domain)) return res.status(400).json({ msg: 'Disposable email not allowed', status: 0 });
    if (!allowedDomains.includes(domain)) return res.status(400).json({ msg: 'Email not allowed. Please use a valid email', status: 0 });
    // check email fake or right
    if (disposableDomains.includes(domain)) {
      return res.status(400).json({ msg: 'Email not allowed. Please use a valid email.', status: 0 });
    }

    // ---------------- Device ID limit ----------------
    const deviceCount = await User.countDocuments({ deviceId });
    if (deviceCount >= MAX_DEVICE_REGISTRATION) return res.status(400).json({ msg: 'Too many suspicious signups attempts detected from this device', status: 0 });

    // ---------------- Duplicate Email / Phone ----------------
    const existUser = await User.findOne({ email });
    if (existUser) {
      return res.status(409).json({ msg: "User already exists", status: 0 });
    }
    const existPhone = await User.findOne({ phone_number });
    if (existPhone) {
      return res.status(409).json({ msg: "User already exists", status: 0 });
    }

    // ---------------- Referral code ----------------
    const NeweferralCode = await generateUniqueReferralCode();
    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy });
      if (!referrer) {
        return res.status(400).json({ msg: "Invalid referral code" });
      }
    }

    // ---------------- Signup bonus ----------------
    const settings = await ReferralSettings.findOne().sort({ createdAt: -1 });
    const signUpBonas = settings?.signupBonus || 0;

    const hashPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      first_name,
      middle_name,
      last_name,
      phone_number,
      email,
      dob,
      gender,
      address,
      pin_code,
      state,
      language,
      password: hashPassword,
      deviceId,
      ip: clientIp,
      referredBy,
      referralCode: NeweferralCode,
      wallet: signUpBonas
    });
    await newUser.save();

    // ---------------- Email verification ----------------
    const verificationToken = JWT.sign(
      { userId: newUser._id, email, referredBy },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );


    // Send email asynchronously
    try {
      const link = `https://earnq.in/verify-email?token=${verificationToken}`;

      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your EarnQ Account</title>
  </head>
  <body style="margin:0; padding:0; background:#eef2f7; font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;">

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td align="center" style="padding:40px 20px;">
          
          <!-- Card -->
          <table border="0" cellpadding="0" cellspacing="0" width="600" style="background:#ffffff; border-radius:10px; overflow:hidden; ">
            
            <!-- Header with gradient -->
            <tr>
              <td align="center" style="padding:20px 20px; background:linear-gradient(135deg, #6d28d9, #6366f1); color:#ffffff;">
                <h1 style="margin:0; font-size:28px; font-weight:700; letter-spacing:-0.5px;">EarnQ</h1>
                <p style="margin:10px 0 0; font-size:15px; opacity:0.9;">Verify your email to continue</p>
              </td>
            </tr>
            
            <!-- Body -->
            <tr>
              <td style="padding:20px 30px; text-align:left; color:#374151; font-size:14px; line-height:1.7;">
                <p style="margin:0 0 10px;">Hi there 👋,</p>
                <p style="margin:0 0 25px;">
                  Thanks for creating an account with <strong>EarnQ</strong>.  
                  To get started, please confirm your email address by clicking the button below:
                </p>

                <!-- Button -->
                <div style="text-align:center; margin:30px 0;">
                  <a href="${link}" target="_blank"
                     style="background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#ffffff; padding:6px 32px; border-radius:50px; text-decoration:none; font-size:14px; font-weight:600; box-shadow:0 6px 20px rgba(99,102,241,0.35); display:inline-block;">
                    Verify My Account
                  </a>
                </div>

                <p style="margin:0 0 0px; color:#6b7280; font-size:14px;">
                  If the button doesn’t work, copy and paste this link into your browser:
                </p>

                <p style="margin:0; word-break:break-all; color:#4f46e5; font-size:12px;">
                  ${link}
                </p>

                <p style="margin-top:25px; font-size:12px; color:#6b7280;">
                  ⏳ This link will expire in <strong>5 minutes</strong> for your security.<br/>
                  Didn’t sign up for EarnQ? Please ignore this email.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="background:#f9fafb; padding:20px; font-size:12px; color:#9ca3af; border-top:1px solid #eee;">
                <p style="margin:0;">&copy; 2025 EarnQ. All rights reserved.</p>
                <p style="margin:3px 0 0;">This is an automated message — please do not reply.</p>
              </td>
            </tr>

          </table>
          <!-- End Card -->

        </td>
      </tr>
    </table>

  </body>
</html>
`;

      await sendEmail(email, "Verify your Email", html);

    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }


    return res.status(201).json({
      msg: "Registration successful! Please check your email and verify your account.",
      status: 1,
      token: verificationToken
    });

  } catch (error) {
    console.error("Signup error:", error.message);
    return res.status(500).json({ msg: "Signup failed", status: 0 });
  }
};



const resendVerificationEmail = async (req, res) => {

  try {
    const { email } = req.body;
    const user = await User.findOne({ email }).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'User not found', status: 0 });
    }
    if (user.verified) {
      return res.status(400).json({ msg: 'Email already verified', status: 0 });
    }

    // Generate email verification token
    const verificationToken = JWT.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const link = `https://earnq.in/verify-email?token=${verificationToken}`;

    // Send verification email
    const html = `<p>Click below to verify your email:</p><a href="${link}">Verify Email</a>`;
    await sendEmail(email, "Verify your Email", html);

    return res.status(200).json({ msg: 'Verification email resent', status: 1, token: verificationToken });

  } catch (error) {
    console.error('Resend Email Error:', error.message);
    return res.status(500).json({ msg: 'Failed to resend email', status: 0 });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ email });
    // Check if user exists
    if (!findUser) {
      return res.status(409).json({ msg: "Invalid credentials. Contact administrator.", status: 0 });
    }

    // Check if email is verified
    if (!findUser.verified) {
      return res.status(403).json({ msg: "Please verify your email before logging in.", status: 0 });
    }

    // account suspended?
    if (findUser.isSuspended) return res.status(403).json({ msg: 'Account suspended. Contact support.' });

    // Compare password
    const isMatchPassword = await bcrypt.compare(password, findUser.password);
    if (!isMatchPassword) {
      //  increment failed-login counter and lock after N attempts
      findUser.failedLoginAttempts = (findUser.failedLoginAttempts || 0) + 1;
      if (findUser.failedLoginAttempts >= 3) {
        findUser.isSuspended = true; // or set a temporary lock with timestamp
      }
      await findUser.save();
      return res.status(401).json({ msg: "Invalid credentials", status: 0 });
    }

    // reset failed attempts on successful login
    findUser.failedLoginAttempts = 0;

    // 1️⃣ Delete any old sessions (logout old users automatically)
    await Session.deleteMany({ userId: findUser._id });

    // Mark user as logged in
    findUser.isLogin = true;
    findUser.lastLogin = new Date();
    await findUser.save();
    // Generate JWT token
    const token = JWT.sign(
      {
        id: findUser._id,
        firstName: findUser.first_name,
        middleName: findUser.middle_name,
        lastName: findUser.last_name,
        gender: findUser.gender,
        email: findUser.email,
        phone: findUser.phone_number,
        lang: findUser.language,
        state: findUser.state,
        isLogin: findUser.isLogin,
        isPremium: findUser.isPremium,
        premiumExpiry: findUser.premiumExpiry,
        referredBy: findUser.referredBy,
        referralCode: findUser.referralCode,
        wallet: findUser.wallet,
        lastLogin: findUser.lastLogin,
        dob: findUser.dob,
        address: findUser.address,
        pinCode: findUser.pin_code,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Save session in DB
    const session = new Session({ userId: findUser._id, token });
    await session.save();

    // Set cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      domain: '.earnq.in',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    findUser.password = undefined;
    return res.status(200).json({
      msg: "Login successful",
      status: 1,
      access_token: token,
      user: findUser,
    });

  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ msg: "Login failed", status: 0 });
  }
};


const checkSession = async (req, res) => {
  try {
    return res.status(200).json({
      status: true,
      msg: "Session valid",
      // user: req.user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      msg: "Failed to check session",
    });
  }
};

const logout = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ msg: 'No token found' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = JWT.verify(token, process.env.JWT_SECRET);
    await User.findByIdAndUpdate(decoded.id, { isLogin: false });
    return res.json({ msg: 'Logout successful' });
  } catch (err) {
    return res.status(403).json({ msg: 'Invalid token' });
  }
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token in DB with expiry (15 minutes)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Reset link
    // const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    const resetUrl = `https://earnq.in/reset-password/${resetToken}`;

    const html = `
<!DOCTYPE html>
<html lang="en" style="margin:0;padding:0;">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f7fb;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e6e9f2;">
          <!-- Header -->
         

          <!-- Body -->
          <tr>
            <td style="padding:28px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
              <h1 style="margin:0 0 12px 0;font-size:20px;line-height:28px;">Reset your password</h1>
              <p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#374151;">
                You requested to reset your password. Click the button below to create a new one.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 16px 0;">
                <tr>
                  <td align="center" bgcolor="#0d6efd" style="border-radius:6px;">
                    <a href="${resetUrl}" target="_blank"
                       style="display:inline-block;padding:6px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;
                              color:#ffffff;text-decoration:none;border-radius:6px;">
                      Reset password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 12px 0;font-size:12px;line-height:20px;color:#6b7280;">
                If the button doesn’t work, copy and paste this link into your browser:
              </p>
              <p style="word-break:break-all;margin:0 0 20px 0;">
                <a href="${resetUrl}" target="_blank" style="color:#0d6efd;font-size:12px;text-decoration:underline;">
                  ${resetUrl}
                </a>
              </p>

              <!-- Notes -->
              <p style="margin:0 0 6px 0;font-size:12px;line-height:20px;color:#6b7280;">
                This link will expire in <strong>15 minutes</strong>.
              </p>
              <p style="margin:0 0 6px 0;font-size:12px;line-height:20px;color:#6b7280;">
                If you didn’t request this, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 24px;background:#f9fafb;border-top:1px solid #eef2f7;
                       font-family:Arial,Helvetica,sans-serif;color:#6b7280;font-size:12px;line-height:18px;">
              Need help? Contact us at
              <a href="mailto:${process.env.SUPPORT_EMAIL || 'support@earnq.example'}" style="color:#0d6efd;text-decoration:underline;">
                ${process.env.SUPPORT_EMAIL || 'support@earnq.in'}
              </a>
            </td>
          </tr>
        </table>

        <!-- Brand line -->
        <p style="font-family:Arial,Helvetica,sans-serif;color:#9ca3af;font-size:11px;line-height:16px;margin:12px 0 0 0;">
          © ${new Date().getFullYear()} ${process.env.APP_NAME || 'EarnQ'}. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    // Send email
    await sendEmail(email, "Password Reset Request", html);
    res.json({ message: "Password reset link sent to your email" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ message: "Password is required" });

    // Hash token from params
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Remove reset token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.json({ message: "Password reset successful. You can now log in." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  checkSession,
  logout,
  resendVerificationEmail,
  forgotPassword,
  resetPassword

};
