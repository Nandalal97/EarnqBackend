// validators/withdrawal.schema.js
const { z } = require('zod');

const baseSchema = z.object({
  userId: z
    .string({ required_error: 'User ID is required' })
    .min(1, 'User ID must not be empty'),

  amount: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .min(500, 'Minimum withdrawal amount is ₹500'),

  paymentMethod: z.enum(['upi', 'bank'], {
    required_error: 'Payment method must be UPI or bank',
  }),

  upiId: z.string().regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format').optional(),

  accountNumber: z.string().regex(/^\d{9,18}$/, 'Account number must be 9-18 digits').optional(),

  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code').optional(),

  bankName: z.string().min(2, 'Bank name is required').optional(),

  fullName: z
    .string()
    .min(3, 'Full name is required and must be at least 3 characters'),

  phoneNumber: z
    .string()
    .length(10, 'Phone number must be 10 digits')
    .regex(/^[0-9]{10}$/, 'Phone number must contain digits only'),
});

// Conditional schema based on payment method
const withdrawalSchema = baseSchema.superRefine((data, ctx) => {
  if (data.paymentMethod === 'upi') {
    if (!data.upiId) {
      ctx.addIssue({
        path: ['upiId'],
        message: 'UPI ID is required for UPI withdrawals',
        code: z.ZodIssueCode.custom,
      });
    }
  }

  if (data.paymentMethod === 'bank') {
    if (!data.accountNumber) {
      ctx.addIssue({
        path: ['accountNumber'],
        message: 'Account number is required for bank withdrawals',
        code: z.ZodIssueCode.custom,
      });
    }
    if (!data.ifscCode) {
      ctx.addIssue({
        path: ['ifscCode'],
        message: 'IFSC code is required for bank withdrawals',
        code: z.ZodIssueCode.custom,
      });
    }
    if (!data.bankName) {
      ctx.addIssue({
        path: ['bankName'],
        message: 'Bank name is required for bank withdrawals',
        code: z.ZodIssueCode.custom,
      });
    }
  }
});

const validateUserWithdrawal = (req, res, next) => {
  try {
    req.body = withdrawalSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        msg: error.errors[0].message,
        status: 0,
        errors: error.errors,
      });
    }
    next(error);
  }
};

module.exports = {
  validateUserWithdrawal,
};
