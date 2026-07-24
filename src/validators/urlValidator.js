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

export const validateUrlShorten = [
  body('originalUrl')
    .trim()
    .notEmpty()
    .withMessage('Destination URL is required')
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    })
    .withMessage('Please provide a valid URL starting with http:// or https://'),
  body('customCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3 })
    .withMessage('Custom code must be at least 3 characters long')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Custom code can only contain alphanumeric characters, hyphens, and underscores'),
  validateRequest
];
