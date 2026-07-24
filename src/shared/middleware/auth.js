import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../errors/errors.js';
import { env } from '../config/env.js';

export const auth = (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (!token) {
      throw new UnauthorizedError('No authentication token, authorization denied');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      throw new UnauthorizedError('Token verification failed, authorization denied');
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(error instanceof UnauthorizedError ? error : new UnauthorizedError(error.message));
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token) {
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      }
    }

    if (token) {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      if (decoded && decoded.id) {
        req.user = decoded;
      }
    }
  } catch (error) {
  }
  next();
};

export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new ForbiddenError('Access denied. Administrator privileges required.');
  }
  next();
};
