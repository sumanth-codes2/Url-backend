import { userRepository } from '../repositories/userRepository.js';
import { urlRepository } from '../repositories/urlRepository.js';
import { BadRequestError, NotFoundError } from '../shared/errors/errors.js';
import Url from '../models/Url.js';

export const getStats = async (req, res, next) => {
  try {
    const totalUsers = await userRepository.findAll();
    const totalLinks = await urlRepository.findAll();
    
    const clickSummary = await Url.aggregate([
      { $group: { _id: null, total: { $sum: "$clicks" } } }
    ]);
    const totalClicks = clickSummary.length > 0 ? clickSummary[0].total : 0;

    const suspiciousLinks = await Url.countDocuments({
      $or: [
        { originalUrl: { $regex: /phish|verify|login|signin|paypal|update/i } }
      ]
    });

    const responseData = {
      totalUsers: totalUsers.length,
      totalLinks: totalLinks.length,
      totalClicks,
      suspiciousLinks
    };

    res.json({
      success: true,
      message: 'Admin stats compiled successfully',
      data: responseData,
      ...responseData
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await userRepository.findAll();
    const cleanUsers = users.map(u => {
      u.password = undefined;
      return u;
    });

    res.json(cleanUsers);
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!role || !['admin', 'user'].includes(role)) {
      throw new BadRequestError('Invalid role assignment');
    }

    const updatedUser = await userRepository.updateRole(req.params.id, role);
    if (!updatedUser) {
      throw new NotFoundError('User not found');
    }
    updatedUser.password = undefined;

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

export const getLinks = async (req, res, next) => {
  try {
    const links = await Url.find()
      .populate('creator', 'username email')
      .sort({ createdAt: -1 });

    res.json(links);
  } catch (error) {
    next(error);
  }
};
