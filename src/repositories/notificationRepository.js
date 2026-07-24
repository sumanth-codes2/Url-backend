import Notification from '../models/Notification.js';

export const notificationRepository = {
  create: (notificationData) => {
    const notification = new Notification(notificationData);
    return notification.save();
  },
  findByUser: (userId, limit = 50) => Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(limit),
  findOneByIdAndUser: (id, userId) => Notification.findOne({ _id: id, user: userId }),
  updateManyRead: (userId) => Notification.updateMany({ user: userId, read: false }, { read: true }),
  findOne: (query) => Notification.findOne(query)
};
