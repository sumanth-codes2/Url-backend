import logger from '../logger/logger.js';

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  if (statusCode === 500) {
    logger.error('Unhandled Server Error: ' + err.stack);
    if (process.env.NODE_ENV === 'production') {
      message = 'An internal server error occurred';
    }
  } else {
    logger.warn('Operational Error: ' + err.message + ' (Status: ' + statusCode + ')');
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};
