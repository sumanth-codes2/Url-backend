import express from 'express';
import {
  getStats, getUsers, updateUserRole, getLinks
} from '../controllers/adminController.js';
import { auth, adminOnly } from '../shared/middleware/auth.js';

const router = express.Router();

router.use(auth, adminOnly);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.get('/links', getLinks);

export default router;
