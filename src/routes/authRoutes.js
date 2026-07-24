import express from 'express';
import rateLimit from 'express-rate-limit';
import { 
  register, login, logout, getProfile, 
  getNotifications, readNotification, readAllNotifications,
  forgotPassword, verifyOtp, resetPassword, changePassword
} from '../controllers/authController.js';
import { auth } from '../shared/middleware/auth.js';
import { validateRegister, validateLogin } from '../validators/authValidator.js';

const router = express.Router();

// Limit forgot-password requests to 3 requests per 15 minutes (or 1000 in dev)
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 3 : 1000,
  message: {
    success: false,
    message: 'Too many password recovery requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limit verify-otp attempts to 5 attempts per 15 minutes (or 1000 in dev)
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: {
    success: false,
    message: 'Too many verification attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);
router.post('/reset-password', resetPassword);
router.post('/change-password', auth, changePassword);
router.get('/me', auth, getProfile);
router.get('/notifications', auth, getNotifications);
router.put('/notifications/:id/read', auth, readNotification);
router.put('/notifications/read-all', auth, readAllNotifications);

export default router;
