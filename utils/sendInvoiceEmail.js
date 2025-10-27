const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,        // your email
      pass: process.env.EMAIL_PASS         // app password
    },
  });

  await transporter.sendMail({
    from: `"EarnQ Subscription" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;
