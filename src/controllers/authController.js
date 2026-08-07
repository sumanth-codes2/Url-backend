import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/userRepository.js';
import { workspaceRepository } from '../repositories/workspaceRepository.js';
import { notificationRepository } from '../repositories/notificationRepository.js';
import { ServiceRegistry } from '../services/serviceRegistry.js';
import { BadRequestError, NotFoundError } from '../shared/errors/errors.js';
import { env } from '../shared/config/env.js';
import logger from '../shared/logger/logger.js';
import crypto from 'crypto';
import PasswordReset from '../models/PasswordReset.js';

export const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw new BadRequestError('An account with this email already exists');
    }

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      throw new BadRequestError('Username is already taken');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await userRepository.create({
      username,
      email,
      password: hashedPassword,
      role: role === 'admin' ? 'admin' : 'user'
    });

    const defaultWorkspace = await workspaceRepository.create({
      name: `${username}'s Workspace`,
      owner: newUser._id,
      members: [{ user: newUser._id, role: 'admin' }]
    });

    newUser.activeWorkspace = defaultWorkspace._id;
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    try {
      const notificationService = ServiceRegistry.get('NotificationService');
      await notificationService.sendNotification(
        newUser._id.toString(),
        'Welcome to BitylGlow!',
        `Your default workspace "${defaultWorkspace.name}" has been initialized. Start sharing links!`,
        'system'
      );
    } catch (notifErr) {
      logger.warn(`Could not send welcome notification to user ${newUser._id}: ${notifErr.message}`);
    }

    const responseData = {
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        activeWorkspace: newUser.activeWorkspace
      }
    };

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: responseData,
      ...responseData
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new BadRequestError('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const responseData = {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        activeWorkspace: user.activeWorkspace
      }
    };

    res.json({
      success: true,
      message: 'Login successful',
      data: responseData,
      ...responseData
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (req, res, next) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({
    success: true,
    message: 'Logged out successfully',
    data: {}
  });
};

export const getProfile = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    user.password = undefined;

    res.json({
      success: true,
      message: 'Profile fetched successfully',
      data: user,
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      activeWorkspace: user.activeWorkspace,
      createdAt: user.createdAt
    });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationRepository.findByUser(req.user.id);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

export const readNotification = async (req, res, next) => {
  try {
    const notification = await notificationRepository.findOneByIdAndUser(req.params.id, req.user.id);
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    notification.read = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

export const readAllNotifications = async (req, res, next) => {
  try {
    await notificationRepository.updateManyRead(req.user.id);
    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new BadRequestError('Email address is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError('Invalid email format');
    }

    const user = await userRepository.findByEmail(email);

    const genericResponse = {
      success: true,
      message: 'If an account with this email exists, we have sent a verification code.'
    };

    if (!user) {
      logger.info(`Password Reset: User search result for "${email}" - NOT found.`);
      return res.json(genericResponse);
    }

    logger.info(`Password Reset: User search result for "${email}" - User found.`);
    const workspaces = await workspaceRepository.findByUser(user._id);
    if (!workspaces || workspaces.length === 0) {
      logger.warn(`Password Reset: User "${email}" exists but has no active dashboard/workspace created.`);
      return res.json(genericResponse);
    }

    logger.info(`Password Reset: User "${email}" has active dashboard/workspace.`);
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await PasswordReset.deleteMany({ userId: user._id });
    await PasswordReset.create({
      userId: user._id,
      hashedOTP,
      expiresAt
    });

    if (env.NODE_ENV === 'development') {
      logger.info(`Password Recovery OTP generated for ${email}. (OTP bypass: ${otp})`);
    } else {
      logger.info(`Password Recovery OTP generated for ${email}.`);
    }

    const emailService = ServiceRegistry.get('EmailService');
    try {
      if (req.headers['x-test-bypass'] === 'true' && env.NODE_ENV !== 'production') {
        logger.info(`Password Reset: Test bypass enabled for ${email}. Email dispatch skipped.`);
      } else {
        await emailService.sendOtpEmail(email, otp);
      }
    } catch (emailErr) {
      logger.error(`Password Reset: Email dispatch failed for ${email}: ${emailErr.message}`);
      await PasswordReset.deleteMany({ userId: user._id });
      throw new BadRequestError(`Unable to send verification email. Details: ${emailErr.message}`);
    }

    res.json({
      ...genericResponse,
      otp: env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      throw new BadRequestError('Email and OTP code are required');
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestError('Invalid verification parameters');
    }

    const resetRecord = await PasswordReset.findOne({ userId: user._id });
    if (!resetRecord) {
      throw new BadRequestError('No active verification session found. Please request a new code.');
    }

    if (resetRecord.attempts >= 5) {
      throw new BadRequestError('Verification session locked due to too many failed attempts. Please request a new OTP.');
    }

    if (new Date() > resetRecord.expiresAt) {
      await PasswordReset.deleteOne({ _id: resetRecord._id });
      throw new BadRequestError('Verification code has expired. Please request a new one.');
    }

    const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');
    if (resetRecord.hashedOTP !== hashedInput) {
      resetRecord.attempts += 1;
      await resetRecord.save();

      const remaining = 5 - resetRecord.attempts;
      if (remaining <= 0) {
        throw new BadRequestError('Verification session locked due to too many failed attempts. Please request a new OTP.');
      }
      throw new BadRequestError(`Invalid verification code. ${remaining} attempts remaining.`);
    }
    await PasswordReset.deleteOne({ _id: resetRecord._id });
    const resetToken = jwt.sign(
      { id: user._id, email: user.email, purpose: 'password-reset' },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully. Proceed to reset password.',
      resetToken
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;
    if (!resetToken || !newPassword || !confirmPassword) {
      throw new BadRequestError('Required parameters missing');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, env.JWT_SECRET);
    } catch (err) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    if (decoded.purpose !== 'password-reset') {
      throw new BadRequestError('Invalid reset signature context');
    }
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    if (newPassword.length < minLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      throw new BadRequestError('Password does not meet complexity requirements: 8+ characters, with uppercase, lowercase, numbers, and special characters.');
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. Please log in with your new credentials.'
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      throw new BadRequestError('Current and new password are required');
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestError('Invalid current password');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    next(error);
  }
};
