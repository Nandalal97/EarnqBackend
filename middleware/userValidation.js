// validators/authSchema.js
const { z } = require('zod');

const userRegistrationSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .regex(/^[a-zA-Z]+$/, 'First name must be letters'),

  middle_name: z
    .string()
    .regex(/^[a-zA-Z]*$/, 'Middle name must be letters')
    .optional(),

last_name: z
  .string()
  .regex(/^[a-zA-Z]+$/, 'Last name must be letters')
  .optional()
  .or(z.literal('')), // allow empty string


  phone_number: z
    .string()
    .nonempty({ message: 'Phone number is required' })
    .length(10, 'Please enter a valid number')
    .regex(/^[0-9]{10}$/, 'Phone number must be digits'),


  email: z
    .string()
    .nonempty({ message: 'Email is required' })
    .email('Invalid email address'),

  dob: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date of birth',
    }),

  gender: z
    .enum(['Male', 'Female', 'Others'], {
      errorMap: () => ({ message: 'Gender must be Male, Female, or Other' }),
    }),

  address: z
    .string()
    .min(5, 'Address must be at least 5 characters'),

  pin_code: z
    .string()
    .length(6, 'PIN code must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'PIN code must be numbers'),

  state: z
    .string('State is required'),

  language: z
    .string('Language is required'),

  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  deviceId: z
    .string('deviceId is required'),
  referredBy: z.string(),
});

const validateUserRegistration = (req, res, next) => {
  try {
    req.body = userRegistrationSchema.parse(req.body);
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

// Login Validation
const userLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Unauthorized access'),
});

const validateUserLogin = (req, res, next) => {
  try {
    req.body = userLoginSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      // If validation fails, 
      return res.status(400).json({
        //   msg: 'Validation failed',
        status: 0,
        errors: error.errors[0].message,
      });
    }

    next(error);
  }
};


// user update validation
const userUpdateSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .regex(/^[a-zA-Z]+$/, 'First name must contain only letters'),

  middle_name: z
    .string()
    .regex(/^[a-zA-Z]*$/, 'Middle name must contain only letters')
    .optional(),

  last_name: z
    .string()
    .min(1, 'Last name is required')
    .regex(/^[a-zA-Z]+$/, 'Last name must contain only letters'),

  dob: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date of birth',
    }),

  address: z
    .string()
    .min(5, 'Address must be at least 5 characters'),
  gender: z.enum(['Male', 'Female', 'Others'], {
    errorMap: () => ({ message: 'Gender must be Male, Female, or Others' }),
  }),
  
  pin_code: z
    .string()
    .nonempty({ message: 'PIN code is required' })
    .length(6, 'PIN code must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'PIN code must be numeric'),

  state: z
    .string()
    .nonempty({ message: 'State is required' }),

  language: z
    .string('Language is required'),

});

const validateUserProfileUpdate = (req, res, next) => {
  try {
    req.body = userUpdateSchema.parse(req.body);
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
  validateUserRegistration,
  validateUserLogin,
  validateUserProfileUpdate
};
