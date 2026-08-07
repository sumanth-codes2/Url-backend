import express from 'express';
import {
  getWorkspaces, createWorkspace, inviteMember, switchWorkspace,
  getFolders, createFolder, deleteFolder, getAiRecommendations, removeMember
} from '../controllers/workspaceController.js';
import { auth } from '../shared/middleware/auth.js';

const router = express.Router();

router.get('/', auth, getWorkspaces);
router.post('/', auth, createWorkspace);
router.post('/:id/invite', auth, inviteMember);
router.post('/switch/:id', auth, switchWorkspace);
router.delete('/:id/members/:userId', auth, removeMember);
router.get('/folders', auth, getFolders);
router.post('/folders', auth, createFolder);
router.delete('/folders/:folderId', auth, deleteFolder);
router.get('/ai/recommendations', auth, getAiRecommendations);

export default router;
