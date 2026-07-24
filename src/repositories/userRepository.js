import User from '../models/User.js';

export const userRepository = {
  findById: (id) => User.findById(id),
  findByEmail: (email) => User.findOne({ email }),
  findByUsername: (username) => User.findOne({ username }),
  create: (userData) => {
    const user = new User(userData);
    return user.save();
  },
  updateActiveWorkspace: (userId, workspaceId) => {
    return User.findByIdAndUpdate(userId, { activeWorkspace: workspaceId }, { new: true });
  },
  findAll: () => User.find(),
  updateRole: (userId, role) => {
    return User.findByIdAndUpdate(userId, { role }, { new: true });
  }
};
