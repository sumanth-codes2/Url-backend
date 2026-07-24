import Folder from '../models/Folder.js';

export const folderRepository = {
  findById: (id) => Folder.findById(id),
  findByWorkspace: (workspaceId) => Folder.find({ workspace: workspaceId }),
  create: (folderData) => {
    const folder = new Folder(folderData);
    return folder.save();
  },
  delete: (id) => Folder.findByIdAndDelete(id),
  findByNameAndWorkspace: (name, workspaceId) => Folder.findOne({ name, workspace: workspaceId })
};
