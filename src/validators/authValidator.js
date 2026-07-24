import { body, validationResult } from 'express-validator';
import { BadRequestError } from '../shared/errors/errors.js';

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    throw new BadRequestError('Validation failed', formattedErrors);
  }
  next();
};

export const validateRegister = [
  body('username')
    .trim()
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters long'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  validateRequest
];

export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validateRequest
];
