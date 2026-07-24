import express from 'express';
import { 
  getAnalytics, getAiInsights, getAiPredictions, exportCsv, chatAnalytics 
} from '../controllers/analyticsController.js';
import { auth } from '../shared/middleware/auth.js';

const router = express.Router();

router.get('/:urlId', auth, getAnalytics);
router.get('/:urlId/ai-insights', auth, getAiInsights);
router.get('/:urlId/ai-predictions', auth, getAiPredictions);
router.get('/:urlId/export/csv', auth, exportCsv);
router.post('/chat', auth, chatAnalytics);

export default router;
