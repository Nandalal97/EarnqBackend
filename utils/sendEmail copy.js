// utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, html) => {
  const transporter = nodemailer.createTransport({
    host: "email-smtp.us-east-1.amazonaws.com", // Region-specific
    port: 465,
    secure: true,
    auth: {
      user: process.env.SES_SMTP_USER, // From Step 4
      pass: process.env.SES_SMTP_PASS, // From Step 4
    },
  });

  const mailOptions = {
    from: '"EarnQ" <no-reply@earnq.in>', // Verified sender
    to, // Receiver
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
