const axios = require('axios');

const verifyRecaptcha = async (token) => {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret,
          response: token,
        },
      }
    );
    return response.data.success;
  } catch (err) {
    console.error('reCAPTCHA error:', err.message);
    return false;
  }
};

module.exports = verifyRecaptcha;
