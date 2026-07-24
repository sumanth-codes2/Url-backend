import Workspace from '../models/Workspace.js';

export const workspaceRepository = {
  findById: (id) => Workspace.findById(id).populate('owner', 'username email').populate('members.user', 'username email'),
  findByUser: (userId) => Workspace.find({ 'members.user': userId }).populate('owner', 'username email').populate('members.user', 'username email'),
  create: (workspaceData) => {
    const workspace = new Workspace(workspaceData);
    return workspace.save();
  },
  addMember: (workspaceId, memberData) => {
    return Workspace.findByIdAndUpdate(
      workspaceId,
      { $push: { members: memberData } },
      { new: true }
    );
  },
  findOwnedByUser: (userId) => Workspace.find({ owner: userId }).populate('owner', 'username email').populate('members.user', 'username email')
};
