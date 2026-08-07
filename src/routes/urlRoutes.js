import express from 'express';
import {
  shortenUrl, bulkShorten, getMyUrls, getArchivedUrls, getFolderUrls,
  verifyPassword, getQrCode, updateUrl, bulkDeleteUrls, deleteUrl,
  getAiAlias, getAiAliases, getAiSuggestedName, getAiPhishingCheck,
  getPreview, getAiMarketing
} from '../controllers/urlController.js';
import { auth, optionalAuth } from '../shared/middleware/auth.js';
import { validateUrlShorten } from '../validators/urlValidator.js';

const router = express.Router();

router.post('/shorten', optionalAuth, validateUrlShorten, shortenUrl);
router.post('/bulk-shorten', auth, bulkShorten);
router.get('/my-urls', auth, getMyUrls);
router.get('/archived-urls', auth, getArchivedUrls);
router.get('/folder/:folderId', auth, getFolderUrls);
router.post('/verify-password', verifyPassword);
router.get('/qr/:shortCode', getQrCode);
router.put('/:id', auth, updateUrl);
router.post('/bulk-delete', auth, bulkDeleteUrls);
router.delete('/:id', auth, deleteUrl);

router.post('/ai/alias', auth, getAiAlias);
router.post('/ai/aliases', auth, getAiAliases);
router.post('/ai/suggest-name', auth, getAiSuggestedName);
router.post('/ai/phishing-check', auth, getAiPhishingCheck);
router.post('/preview', optionalAuth, getPreview);
router.post('/:id/marketing', auth, getAiMarketing);

export default router;
