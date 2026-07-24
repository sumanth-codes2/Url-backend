import Url from '../models/Url.js';

export const urlRepository = {
  findById: (id) => Url.findById(id),
  findByShortCode: (shortCode) => Url.findOne({ shortCode }),
  create: (urlData) => {
    const url = new Url(urlData);
    return url.save();
  },
  findByCreator: (creatorId) => Url.find({ creator: creatorId }),
  findByWorkspace: (workspaceId) => Url.find({ workspace: workspaceId, isArchived: false }),
  findArchivedByWorkspace: (workspaceId) => Url.find({ workspace: workspaceId, isArchived: true }),
  findByFolder: (folderId) => Url.find({ folder: folderId, isArchived: false }),
  update: (id, updateData) => Url.findByIdAndUpdate(id, updateData, { new: true }),
  delete: (id) => Url.findByIdAndDelete(id),
  bulkDelete: (ids, creatorId) => Url.deleteMany({ _id: { $in: ids }, creator: creatorId }),
  incrementClicks: (id) => Url.findByIdAndUpdate(id, { $inc: { clicks: 1 } }, { new: true }),
  findUnarchived: () => Url.find({ isArchived: false }),
  findAll: () => Url.find()
};
