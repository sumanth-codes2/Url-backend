import express from 'express';
import { handleRedirect } from '../controllers/redirectController.js';

const router = express.Router();

router.get('/r/:shortCode', handleRedirect);
router.get('/:shortCode', handleRedirect);

export default router;
