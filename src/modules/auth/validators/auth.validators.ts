import * as Joi from 'joi';

// Common validation patterns
const passwordPattern = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).*$/)
  .required()
  .messages({
    'string.pattern.base':
      'Password must contain at least 8 characters with uppercase, lowercase, number and special character',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'Password is required',
  });

const emailPattern = Joi.string().email().max(255).optional().messages({
  'string.email': 'Please provide a valid email address',
  'string.max': 'Email must not exceed 255 characters',
});

const phonePattern = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .max(20)
  .optional()
  .messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'string.max': 'Phone number must not exceed 20 characters',
  });

const dniPattern = Joi.string().alphanum().min(6).max(20).required().messages({
  'string.alphanum': 'DNI number must contain only letters and numbers',
  'string.min': 'DNI number must be at least 6 characters long',
  'string.max': 'DNI number must not exceed 20 characters',
  'any.required': 'DNI number is required',
});

const namePattern = Joi.string()
  .trim()
  .min(2)
  .max(50)
  .pattern(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/)
  .required()
  .messages({
    'string.pattern.base':
      'Name must contain only letters, spaces, hyphens and apostrophes',
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must not exceed 50 characters',
    'any.required': 'Name is required',
  });

// Register validation schema
export const registerSchema = Joi.object({
  user_email: emailPattern,
  user_password: passwordPattern,
  confirm_password: Joi.string()
    .valid(Joi.ref('user_password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
  user_first_name: namePattern,
  user_last_name: namePattern,
  user_phone_number: phonePattern,
  user_DNI_number: dniPattern,
}).options({ stripUnknown: true });

// Register validation schema for multipart/form-data (with file uploads)
export const registerMultipartSchema = Joi.object({
  user_email: emailPattern,
  user_password: passwordPattern,
  confirm_password: Joi.string()
    .valid(Joi.ref('user_password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
  user_first_name: namePattern,
  user_last_name: namePattern,
  user_phone_number: phonePattern,
  user_DNI_number: dniPattern,
  // Files are handled by multer, not Joi
}).options({ stripUnknown: true });

// Login validation schema
export const loginSchema = Joi.object({
  user_DNI_number: dniPattern,
  user_password: Joi.string().min(1).max(128).required().messages({
    'string.min': 'Password is required',
    'string.max': 'Password must not exceed 128 characters',
    'any.required': 'user_password is required',
    'string.base': 'user_password must be a string',
    'string.empty': 'user_password cannot be empty',
  }),
}).options({ stripUnknown: true, allowUnknown: false });

// Forgot password validation schema (for when user forgot their password)
export const forgotPasswordSchema = Joi.object({
  user_DNI_number: dniPattern,
  new_password: passwordPattern, // Use common pattern, avoid duplicate messages
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
}).options({ stripUnknown: true });

// Reset password validation schema (for token-based reset - now deprecated)
export const resetPasswordSchema = Joi.object({
  token: Joi.string().min(10).max(500).required().messages({
    'string.min': 'Invalid token format',
    'string.max': 'Invalid token format',
    'any.required': 'Reset token is required',
  }),
  new_password: passwordPattern, // Use common pattern, avoid duplicate messages
}).options({ stripUnknown: true });

// Reset password with JWT token validation schema (for private endpoint)
export const resetPasswordWithTokenSchema = Joi.object({
  new_password: passwordPattern, // Use common pattern, avoid duplicate messages
  confirm_password: Joi.string()
    .valid(Joi.ref('new_password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match',
      'any.required': 'Password confirmation is required',
    }),
}).options({ stripUnknown: true });

// File validation for register endpoint (optional - files are validated by multer)
export const filesSchema = Joi.object({
  frontIdFile: Joi.array()
    .items(
      Joi.object({
        fieldname: Joi.string().valid('frontIdFile'),
        originalname: Joi.string().required(),
        mimetype: Joi.string()
          .valid('image/jpeg', 'image/jpg', 'image/png', 'application/pdf')
          .required(),
        size: Joi.number()
          .max(5 * 1024 * 1024)
          .required(), // 5MB limit
      }).unknown(true),
    )
    .max(1)
    .optional(),
  backIdFile: Joi.array()
    .items(
      Joi.object({
        fieldname: Joi.string().valid('backIdFile'),
        originalname: Joi.string().required(),
        mimetype: Joi.string()
          .valid('image/jpeg', 'image/jpg', 'image/png', 'application/pdf')
          .required(),
        size: Joi.number()
          .max(5 * 1024 * 1024)
          .required(), // 5MB limit
      }).unknown(true),
    )
    .max(1)
    .optional(),
}).optional();
