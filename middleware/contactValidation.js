// validators/contactSchema.js
const { z } = require('zod');

const newContactSchema = z.object({
  userId: z
    .string(),
  name: z
    .string()
    .min(1, 'Name is required')
    .regex(/^[a-zA-Z\s]+$/, 'Name must contain only letters and spaces'),
  number: z
    .string()
    .nonempty({ message: 'Phone number is required' })
    .length(10, 'Phone number must be exactly 10 digits')
    .regex(/^[0-9]{10}$/, 'Phone number must contain digits only'),

  email: z
    .string()
    .nonempty({ message: 'Email is required' })
    .email('Invalid email address'),

  subject: z
    .string()
    .nonempty({ message: 'Subject is required' }),

  message: z
    .string()
    .nonempty({ message: 'Message is required' })
});

const newContactValidation = (req, res, next) => {
  try {
    req.body = newContactSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: error.errors[0].message, // You can change this to return all errors if needed
        status: 0,
        errors: error.errors,
      });
    }
    next(error);
  }
};

module.exports = {
  newContactValidation
};
