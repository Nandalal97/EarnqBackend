const { z } = require('zod');

// Helper to safely trim optional strings
const trimString = (schema) =>
    schema.transform((val) => (val ? val.trim() : val));

// Zod schema for creating a new book
const newBookSchema = z.object({
    title: trimString(
        z.string()
            .min(1, 'Book title is required')
    ),
    author: trimString(
        z.string()
            .min(1, 'Author name is required')
    ),
    category: trimString(
        z.string()
            .min(1, 'Category is required')
    ),
    subcategory: trimString(
        z.string()
            .min(1, 'subCategory is required')
    ),
    description: trimString(
        z.string()
            .optional()
    ),
    ebookPrice: z.number({ invalid_type_error: 'EbookPrice must be a number' })
        .min(0, 'Price must be at least 0'),
    ebookSalePrice: z.number({ invalid_type_error: 'Sale price must be a number' })
        .min(0)
        .optional(),
    ebookDiscount: z.number({ invalid_type_error: 'Discount must be a number' })
        .min(0)
        .max(100)
        .optional(),
    hardCopyPrice: z.number({ invalid_type_error: 'ebookPrice must be a number' })
        .min(0, 'Price must be at least 0'),
    hardCopySalePrice: z.number({ invalid_type_error: 'Sale price must be a number' })
        .min(0)
        .optional(),
    hardCopyDiscount: z.number({ invalid_type_error: 'Discount must be a number' })
        .min(0)
        .max(100)
        .optional(),
    bookLanguage: z.string(['en', 'hi', 'bn', 'mr', 'gu', 'pa', 'ta', 'te', 'or', 'ka'])
        .default('en'),
    coverImage: z.string()
        .url('Must be a valid cover image URL')
        .optional(),
     bookUrl: trimString(
        z.string()
            .min(1, 'Book title is required')
            .optional(),
    ),
    totalPages: z.number({ invalid_type_error: 'totalPages must be a number' })
        .min(0, 'total Pages must be at least 0')
        .optional(),
    createdBy: z.string({ required_error: 'CreatedBy is required' }),

    defaultRatings: z.number()
        .min(0)
        .default(0),
    defaultRatingUser: z.number()
        .min(0)
        .default(0),
})
    .refine((data) => !data.salePrice || data.salePrice <= data.price, {
        message: 'Sale price must be less than or equal to price',
        path: ['salePrice'],
    });

// Middleware to validate book requests
const newBookValidation = (req, res, next) => {
    try {
        req.body = newBookSchema.parse(req.body);
        next();
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                message: error.errors[0].message,
                errors: error.errors,
            });
        }
        next(error);
    }
};

module.exports = {
    newBookValidation
};