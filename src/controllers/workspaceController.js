import { workspaceRepository } from '../repositories/workspaceRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { folderRepository } from '../repositories/folderRepository.js';
import { urlRepository } from '../repositories/urlRepository.js';
import { AIService } from '../services/ai/orchestrator/aiService.js';
import { ServiceRegistry } from '../services/serviceRegistry.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../shared/errors/errors.js';

export const getWorkspaces = async (req, res, next) => {
  try {
    const workspaces = await workspaceRepository.findByUser(req.user.id);
    const ownedWorkspaces = await workspaceRepository.findOwnedByUser(req.user.id);

    const allWorkspacesMap = new Map();
    [...workspaces, ...ownedWorkspaces].forEach(w => allWorkspacesMap.set(w._id.toString(), w));
    const allWorkspaces = Array.from(allWorkspacesMap.values());

    res.json(allWorkspaces);
  } catch (error) {
    next(error);
  }
};

export const createWorkspace = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      throw new BadRequestError('Workspace name is required');
    }

    const newWorkspace = await workspaceRepository.create({
      name,
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'admin' }]
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully',
      data: newWorkspace
    });
  } catch (error) {
    next(error);
  }
};

export const inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    if (!email || !role) {
      throw new BadRequestError('Email and role are required');
    }

    const workspace = await workspaceRepository.findById(req.params.id);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const callerMember = workspace.members.find(m => m.user.toString() === req.user.id);
    const isOwner = workspace.owner.toString() === req.user.id;
    if (!isOwner && (!callerMember || callerMember.role !== 'admin')) {
      throw new ForbiddenError('Only workspace admins can invite members');
    }

    const invitedUser = await userRepository.findByEmail(email);
    if (!invitedUser) {
      throw new NotFoundError('No registered user found with this email');
    }

    const alreadyMember = workspace.members.some(m => m.user.toString() === invitedUser._id.toString());
    if (alreadyMember) {
      throw new BadRequestError('User is already a member of this workspace');
    }

    workspace.members.push({ user: invitedUser._id, role });
    await workspace.save();

    const notificationService = ServiceRegistry.get('NotificationService');
    await notificationService.sendNotification(
      invitedUser._id.toString(),
      'Workspace Invitation',
      `You have been added to the workspace "${workspace.name}" as a ${role}.`,
      'workspace'
    );

    res.json({
      success: true,
      message: 'User invited successfully',
      data: { user: invitedUser.username, role }
    });
  } catch (error) {
    next(error);
  }
};

export const switchWorkspace = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const isMember = workspace.owner.toString() === req.user.id ||
                     workspace.members.some(m => m.user.toString() === req.user.id);

    if (!isMember) {
      throw new ForbiddenError('You are not a member of this workspace');
    }

    const updatedUser = await userRepository.updateActiveWorkspace(req.user.id, workspace._id);
    updatedUser.password = undefined;

    res.json({
      success: true,
      message: `Switched to workspace: ${workspace.name}`,
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};

export const getFolders = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const folders = await folderRepository.findByWorkspace(user.activeWorkspace);
    res.json(folders);
  } catch (error) {
    next(error);
  }
};

export const createFolder = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      throw new BadRequestError('Folder name is required');
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const existingFolder = await folderRepository.findByNameAndWorkspace(name.trim(), user.activeWorkspace);
    if (existingFolder) {
      throw new BadRequestError('Folder with this name already exists in this workspace');
    }

    const newFolder = await folderRepository.create({
      name: name.trim(),
      workspace: user.activeWorkspace,
      creator: user._id
    });

    res.status(201).json({
      success: true,
      message: 'Folder created successfully',
      data: newFolder
    });
  } catch (error) {
    next(error);
  }
};

export const deleteFolder = async (req, res, next) => {
  try {
    const folder = await folderRepository.findById(req.params.folderId);
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    const workspace = await workspaceRepository.findById(folder.workspace);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const isMember = workspace.owner.toString() === req.user.id ||
                     workspace.members.some(m => m.user.toString() === req.user.id && (m.role === 'admin' || m.role === 'editor'));
    if (!isMember) {
      throw new ForbiddenError('Insufficient workspace permissions');
    }

    await folderRepository.delete(folder._id);
    res.json({
      success: true,
      message: 'Folder deleted successfully',
      data: { folderId: folder._id }
    });
  } catch (error) {
    next(error);
  }
};

export const getAiRecommendations = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const urls = await urlRepository.findByWorkspace(user.activeWorkspace);
    const recommendations = AIService.generateRecommendations(urls, []);

    res.json({
      success: true,
      message: 'Recommendations generated successfully',
      data: recommendations,
      recommendations
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req, res, next) => {
  try {
    const workspaceId = req.params.id;
    const targetUserId = req.params.userId;

    const workspace = await workspaceRepository.findById(workspaceId);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const getUserIdStr = (obj) => {
      if (!obj) return '';
      return obj._id ? obj._id.toString() : obj.toString();
    };

    const isOwner = getUserIdStr(workspace.owner) === req.user.id;
    const callerMember = workspace.members.find(m => getUserIdStr(m.user) === req.user.id);
    const isAdmin = callerMember && callerMember.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only workspace owners or admins can remove members');
    }

    if (getUserIdStr(workspace.owner) === targetUserId) {
      throw new BadRequestError('The workspace owner cannot be removed');
    }

    const originalMembersLength = workspace.members.length;
    workspace.members = workspace.members.filter(m => getUserIdStr(m.user) !== targetUserId);

    if (workspace.members.length === originalMembersLength) {
      throw new NotFoundError('User is not a member of this workspace');
    }

    await workspace.save();

    const notificationService = ServiceRegistry.get('NotificationService');
    if (notificationService) {
      try {
        await notificationService.sendNotification(
          targetUserId,
          'Removed from Workspace',
          `You have been removed from the workspace "${workspace.name}".`,
          'workspace'
        );
      } catch (err) {
      }
    }

    res.json({
      success: true,
      message: 'Workspace member removed successfully'
    });
  } catch (error) {
    next(error);
  }
};
