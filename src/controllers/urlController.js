import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { urlRepository } from '../repositories/urlRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { folderRepository } from '../repositories/folderRepository.js';
import { workspaceRepository } from '../repositories/workspaceRepository.js';
import { analyticsRepository } from '../repositories/analyticsRepository.js';
import { AIService } from '../services/ai/orchestrator/aiService.js';
import { GeoIpService } from '../services/geo/geoIpService.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../shared/errors/errors.js';
import logger from '../shared/logger/logger.js';
import Url from '../models/Url.js';
import Analytics from '../models/Analytics.js';

const REDIRECT_BASE = process.env.REDIRECT_BASE || 'http://localhost:5000';

const generateShortCode = (length = 6) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const AUTH_REQUIRED_DOMAINS = [
  'chatgpt.com', 'chat.openai.com', 'claude.ai',
  'notion.so', 'figma.com', 'miro.com',
  'docs.google.com', 'drive.google.com', 'mail.google.com',
  'github.com', 'gitlab.com',
  'app.slack.com', 'teams.microsoft.com',
  'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
  'linkedin.com', 'reddit.com',
  'netflix.com', 'spotify.com', 'canva.com',
  'trello.com', 'asana.com', 'monday.com', 'clickup.com',
  'dropbox.com', 'onedrive.live.com', 'sharepoint.com',
  'jira.atlassian.com', 'confluence.atlassian.com'
];

const verifyUrlReachability = async (url) => {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (AUTH_REQUIRED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) {
      return true;
    }
  } catch (e) {
    return false;
  }

  const isYoutube = /youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\
  if (isYoutube) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}`;
      const response = await fetch(oembedUrl, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response.status === 200;
    } catch (e) {
      clearTimeout(timeoutId);
      return false;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; URLShortener/1.0)' }
    });

    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403 || response.status === 407) {
      return true;
    }

    if (!response.ok || response.status === 405) {
      const getController = new AbortController();
      const getTimeoutId = setTimeout(() => getController.abort(), 5000);

      response = await fetch(url, {
        method: 'GET',
        signal: getController.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; URLShortener/1.0)' }
      });
      clearTimeout(getTimeoutId);

      if (response.status === 401 || response.status === 403 || response.status === 407) {
        return true;
      }
    }

    return response.status >= 200 && response.status < 400;
  } catch (error) {
    clearTimeout(timeoutId);
    return false;
  }
};

export const shortenUrl = async (req, res, next) => {
  try {
    const {
      originalUrl, customCode, title, password, expiresAt, maxClicks, tags,
      isOneTimeUse, folderId,
      isABTest, abDestinations,
      isGeoRouting, geoTargets,
      isDeviceRouting, deviceTargets,
      isScheduledRedirect, scheduledTargets
    } = req.body;

    if (!originalUrl) {
      throw new BadRequestError('Original URL is required');
    }

    const urlsToValidate = [];

    let mainUrl = originalUrl.trim();
    if (!/^https?:\/\
      mainUrl = 'http://' + mainUrl;
    }
    urlsToValidate.push(mainUrl);

    if (isABTest && abDestinations && Array.isArray(abDestinations)) {
      abDestinations.forEach((d) => {
        if (d.url && d.url.trim().length > 0) {
          let u = d.url.trim();
          if (!/^https?:\/\
          urlsToValidate.push(u);
        }
      });
    }

    if (isGeoRouting && geoTargets && Array.isArray(geoTargets)) {
      geoTargets.forEach((g) => {
        if (g.url && g.url.trim().length > 0) {
          let u = g.url.trim();
          if (!/^https?:\/\
          urlsToValidate.push(u);
        }
      });
    }

    if (isDeviceRouting && deviceTargets && Array.isArray(deviceTargets)) {
      deviceTargets.forEach((d) => {
        if (d.url && d.url.trim().length > 0) {
          let u = d.url.trim();
          if (!/^https?:\/\
          urlsToValidate.push(u);
        }
      });
    }

    if (isScheduledRedirect && scheduledTargets && Array.isArray(scheduledTargets)) {
      scheduledTargets.forEach((s) => {
        if (s.url && s.url.trim().length > 0) {
          let u = s.url.trim();
          if (!/^https?:\/\
          urlsToValidate.push(u);
        }
      });
    }

    const urlString = mainUrl;

    let safetyCheck = { score: 100, details: '', isSafe: true };

    for (const targetUrl of urlsToValidate) {
      const check = await AIService.detectPhishing(targetUrl);
      if (targetUrl === urlString) {
        safetyCheck = check;
      }
      if (!check.isSafe) {
        return res.status(422).json({
          success: false,
          safetyWarningTriggered: true,
          message: 'Security warning: URL matches phishing or spam heuristic signatures.',
          details: check.details,
          score: check.score
        });
      }
    }

    for (const targetUrl of urlsToValidate) {
      try {
        new URL(targetUrl);
      } catch (e) {
        throw new BadRequestError('Invalid URL format');
      }

      const isReachable = await verifyUrlReachability(targetUrl);
      if (!isReachable) {
        throw new BadRequestError('The destination URL is unreachable or does not exist.');
      }
    }

    let code = '';
    if (customCode) {
      const trimmedCode = customCode.trim();
      if (trimmedCode.length < 3) {
        throw new BadRequestError('Custom code must be at least 3 characters long');
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(trimmedCode)) {
        throw new BadRequestError('Custom code can only contain alphanumeric characters, hyphens, and underscores');
      }

      const existingUrl = await Url.findOne({ shortCode: trimmedCode });
      if (existingUrl) {
        throw new BadRequestError('Custom alias is already in use');
      }
      code = trimmedCode;
    } else {
      let unique = false;
      let attempts = 0;
      while (!unique && attempts < 10) {
        code = generateShortCode();
        const existingUrl = await Url.findOne({ shortCode: code });
        if (!existingUrl) {
          unique = true;
        }
        attempts++;
      }
      if (!unique) {
        throw new Error('Failed to generate unique short code. Please try again.');
      }
    }

    let creatorId = null;
    let workspaceId = null;

    if (req.user) {
      creatorId = req.user.id;
      const user = await userRepository.findById(req.user.id);
      if (user && user.activeWorkspace) {
        workspaceId = user.activeWorkspace;
      }
    }

    const overrideDuplicate = req.body.overrideDuplicate === true;
    if (!overrideDuplicate && workspaceId) {
      const existingUrl = await Url.findOne({
        originalUrl: urlString,
        workspace: workspaceId,
        isArchived: false
      });
      if (existingUrl) {
        return res.status(409).json({
          success: false,
          duplicateDetected: true,
          message: 'This URL has already been shortened in this workspace.',
          url: existingUrl
        });
      }
    }

    let hashedPassword = null;
    let isProtected = false;
    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password.trim(), salt);
      isProtected = true;
    }

    let expiryDate = null;
    if (expiresAt) {
      const parsedDate = new Date(expiresAt);
      if (!isNaN(parsedDate.getTime())) expiryDate = parsedDate;
    }

    let clickLimit = null;
    if (maxClicks !== undefined && maxClicks !== '') {
      const parsedLimit = parseInt(maxClicks, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) clickLimit = parsedLimit;
    }

    let urlTags = [];
    if (tags) {
      if (Array.isArray(tags)) urlTags = tags.map(t => t.trim()).filter(Boolean);
      else if (typeof tags === 'string') urlTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const intelligence = await AIService.analyzeWebsite(urlString);

    const newUrlObj = {
      originalUrl: urlString,
      shortCode: code,
      title: title ? title.trim() : (intelligence.title || 'Shortened Link'),
      creator: creatorId,
      workspace: workspaceId,
      folder: folderId || null,
      password: hashedPassword,
      isPasswordProtected: isProtected,
      expiresAt: expiryDate,
      maxClicks: clickLimit,
      isOneTimeUse: !!isOneTimeUse,
      tags: urlTags.length > 0 ? urlTags : intelligence.tags,
      isABTest: !!isABTest,
      abDestinations: abDestinations || [],
      isGeoRouting: !!isGeoRouting,
      geoTargets: geoTargets || [],
      isDeviceRouting: !!isDeviceRouting,
      deviceTargets: deviceTargets || [],
      isScheduledRedirect: !!isScheduledRedirect,
      scheduledTargets: scheduledTargets || [],
      category: intelligence.category,
      aiTags: intelligence.tags,
      safetyScore: safetyCheck.score,
      safetyDetails: safetyCheck.details,
      healthScore: intelligence.healthScore,
      healthDetails: intelligence.healthDetails,
      metadata: {
        title: intelligence.title,
        description: intelligence.description,
        favicon: intelligence.favicon,
        ogImage: intelligence.ogImage,
        canonicalUrl: intelligence.canonicalUrl,
        readingTime: intelligence.readingTime,
        language: intelligence.language,
        summary: intelligence.summary
      }
    };

    const savedUrl = await urlRepository.create(newUrlObj);

    res.status(201).json({
      success: true,
      message: 'URL shortened successfully',
      data: savedUrl,
      ...savedUrl.toObject()
    });

  } catch (error) {
    logger.error('Error in URL shortening: ' + error.message);
    next(error);
  }
};

export const bulkShorten = async (req, res, next) => {
  try {
    const { links } = req.body;
    if (!links || !Array.isArray(links)) {
      throw new BadRequestError('Links array is required');
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    const workspaceId = user.activeWorkspace;

    const results = [];
    const errors = [];

    for (const link of links) {
      try {
        let urlString = link.originalUrl.trim();
        if (!/^https?:\/\
          urlString = 'http://' + urlString;
        }

        try {
          new URL(urlString);
        } catch (e) {
          errors.push(`Invalid URL format: ${link.originalUrl}`);
          continue;
        }

        const safetyCheck = await AIService.detectPhishing(urlString);
        if (!safetyCheck.isSafe) {
          errors.push(`Blocked for security warning (Phishing/Spam heuristics): ${link.originalUrl}`);
          continue;
        }

        const isReachable = await verifyUrlReachability(urlString);
        if (!isReachable) {
          errors.push(`The destination URL is unreachable or does not exist: ${link.originalUrl}`);
          continue;
        }

        let code = '';
        if (link.customCode) {
          const trimmed = link.customCode.trim();
          const exists = await Url.findOne({ shortCode: trimmed });
          if (exists) {
            code = generateShortCode();
          } else {
            code = trimmed;
          }
        } else {
          code = generateShortCode();
        }

        const newUrlObj = {
          originalUrl: urlString,
          shortCode: code,
          title: link.title || 'Bulk Shortened Link',
          creator: user._id,
          workspace: workspaceId
        };

        const saved = await urlRepository.create(newUrlObj);
        results.push(saved);
      } catch (err) {
        errors.push(`Error saving link "${link.originalUrl}": ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Bulk shortening completed',
      data: { results, errors }
    });
  } catch (error) {
    next(error);
  }
};

export const getMyUrls = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const urls = await Url.find({
      workspace: user.activeWorkspace,
      isArchived: false
    }).sort({ createdAt: -1 });

    res.json(urls);
  } catch (error) {
    next(error);
  }
};

export const getArchivedUrls = async (req, res, next) => {
  try {
    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const urls = await Url.find({
      workspace: user.activeWorkspace,
      isArchived: true
    }).sort({ createdAt: -1 });

    res.json(urls);
  } catch (error) {
    next(error);
  }
};

export const getFolderUrls = async (req, res, next) => {
  try {
    const urls = await Url.find({ folder: req.params.folderId }).sort({ createdAt: -1 });
    res.json(urls);
  } catch (error) {
    next(error);
  }
};

export const verifyPassword = async (req, res, next) => {
  try {
    const { shortCode, password } = req.body;
    if (!shortCode || !password) {
      throw new BadRequestError('Short code and password are required');
    }

    const url = await Url.findOne({ shortCode });
    if (!url) {
      throw new NotFoundError('URL not found');
    }

    if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
      return res.status(410).json({ success: false, message: 'Link has expired' });
    }
    if (url.maxClicks !== null && url.clicks >= url.maxClicks) {
      return res.status(410).json({ success: false, message: 'Link redirect limit reached' });
    }

    const isMatch = await bcrypt.compare(password, url.password);
    if (!isMatch) {
      throw new ForbiddenError('Invalid password');
    }

    url.clicks += 1;
    await url.save();

    const userAgent = req.headers['user-agent'] || '';
    const referrerHeader = req.headers['referer'] || req.headers['referrer'] || '';
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';

    const device = userAgent.toLowerCase().includes('mobi') ? 'Mobile' : 'Desktop';
    const browser = userAgent.toLowerCase().includes('firefox') ? 'Firefox' : 'Chrome';

    const geo = await GeoIpService.lookup(ipAddress);

    Analytics.create({
      urlId: url._id,
      device: device,
      browser,
      country: geo.country,
      countryCode: geo.countryCode,
      stateRegion: geo.stateRegion,
      city: geo.city,
      timezone: geo.timezone,
      latitude: geo.latitude,
      longitude: geo.longitude,
      referrer: referrerHeader ? new URL(referrerHeader).hostname.replace('www.', '') : 'Direct',
      ipAddress,
      isp: geo.isp
    }).catch(err => console.error('Error logging validation analytics:', err.message));

    if (url.isOneTimeUse) {
      url.maxClicks = 1;
      await url.save();
    }

    res.json({
      success: true,
      message: 'Password verified successfully',
      data: { originalUrl: url.originalUrl },
      originalUrl: url.originalUrl
    });

  } catch (error) {
    next(error);
  }
};

export const getQrCode = async (req, res, next) => {
  try {
    const { shortCode } = req.params;
    const fullUrl = `${REDIRECT_BASE}/${shortCode}`;
    const qrDataUrl = await QRCode.toDataURL(fullUrl, {
      margin: 1,
      width: 300,
      color: { dark: '#0f172a', light: '#ffffff' }
    });

    res.json({
      success: true,
      message: 'QR Code generated successfully',
      data: { qrCode: qrDataUrl },
      qrCode: qrDataUrl
    });
  } catch (error) {
    next(error);
  }
};

export const updateUrl = async (req, res, next) => {
  try {
    const { title, originalUrl, tags, folder, isArchived, isFavorite } = req.body;
    const url = await Url.findById(req.params.id);

    if (!url) {
      throw new NotFoundError('URL not found');
    }

    const workspace = await workspaceRepository.findById(url.workspace);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }
    const isMember = workspace.owner.toString() === req.user.id ||
                     workspace.members.some(m => m.user.toString() === req.user.id && (m.role === 'admin' || m.role === 'editor'));

    if (!isMember) {
      throw new ForbiddenError('Insufficient workspace permissions');
    }

    if (title !== undefined) url.title = title.trim();
    if (isArchived !== undefined) url.isArchived = isArchived;
    if (isFavorite !== undefined) url.isFavorite = isFavorite;
    if (folder !== undefined) url.folder = folder;

    if (originalUrl !== undefined) {
      let urlString = originalUrl.trim();
      if (!/^https?:\/\
        urlString = 'http://' + urlString;
      }
      url.originalUrl = urlString;
    }

    if (tags !== undefined) {
      if (Array.isArray(tags)) url.tags = tags.map(t => t.trim()).filter(Boolean);
      else if (typeof tags === 'string') url.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const saved = await url.save();

    res.json({
      success: true,
      message: 'URL updated successfully',
      data: saved
    });
  } catch (error) {
    next(error);
  }
};

export const bulkDeleteUrls = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      throw new BadRequestError('IDs array is required');
    }

    await Analytics.deleteMany({ urlId: { $in: ids } });
    await Url.deleteMany({ _id: { $in: ids } });

    res.json({
      success: true,
      message: 'URLs and associated analytics deleted successfully',
      data: { count: ids.length }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUrl = async (req, res, next) => {
  try {
    const url = await Url.findById(req.params.id);
    if (!url) {
      throw new NotFoundError('URL not found');
    }

    const workspace = await workspaceRepository.findById(url.workspace);
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const isMember = workspace.owner.toString() === req.user.id ||
                     workspace.members.some(m => m.user.toString() === req.user.id && (m.role === 'admin' || m.role === 'editor'));

    if (!isMember) {
      throw new ForbiddenError('Insufficient workspace permissions');
    }

    await Analytics.deleteMany({ urlId: req.params.id });
    await Url.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: 'URL deleted successfully',
      data: { urlId: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

export const getAiAlias = (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    const suggestions = AIService.generateMultipleAliases(originalUrl || '');

    res.json({
      success: true,
      message: 'AI alias suggestions generated successfully',
      data: { alias: suggestions[0], suggestions },
      alias: suggestions[0],
      suggestions
    });
  } catch (err) {
    next(err);
  }
};

export const getAiAliases = (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    const suggestions = AIService.generateMultipleAliases(originalUrl || '');

    res.json({
      success: true,
      message: 'AI alias suggestions generated successfully',
      data: { suggestions },
      suggestions
    });
  } catch (err) {
    next(err);
  }
};

export const getAiSuggestedName = (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    if (!originalUrl) {
      throw new BadRequestError('Original URL is required');
    }
    const suggestion = AIService.suggestName(originalUrl);

    res.json({
      success: true,
      message: 'AI name suggestion generated successfully',
      data: { suggestion },
      suggestion
    });
  } catch (err) {
    next(err);
  }
};

export const getAiPhishingCheck = async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url) {
      throw new BadRequestError('URL is required');
    }
    const report = await AIService.detectPhishing(url);

    res.json({
      success: true,
      message: 'AI safety check completed successfully',
      data: report,
      ...report
    });
  } catch (err) {
    next(err);
  }
};

export const getPreview = async (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    if (!originalUrl) {
      throw new BadRequestError('Original URL is required');
    }

    let urlString = originalUrl.trim();
    if (!/^https?:\/\
      urlString = 'http://' + urlString;
    }

    try {
      new URL(urlString);
    } catch (e) {
      throw new BadRequestError('Invalid URL format');
    }

    const safetyCheck = await AIService.detectPhishing(urlString);
    const isReachable = await verifyUrlReachability(urlString);
    const intelligence = await AIService.analyzeWebsite(urlString);

    res.json({
      success: true,
      message: 'Webpage crawler analysis completed successfully',
      data: {
        originalUrl: urlString,
        isReachable,
        safety: safetyCheck,
        intelligence
      },
      originalUrl: urlString,
      isReachable,
      safety: safetyCheck,
      intelligence
    });
  } catch (error) {
    logger.error('Error fetching webpage preview: ' + error.message);
    next(error);
  }
};

export const getAiMarketing = async (req, res, next) => {
  try {
    const url = await Url.findById(req.params.id);
    if (!url) {
      throw new NotFoundError('URL not found');
    }

    const fullUrl = `${REDIRECT_BASE}/${url.shortCode}`;
    const payload = AIService.generateMarketingContent(fullUrl, url.category, url.title);

    res.json({
      success: true,
      message: 'AI marketing generated successfully',
      data: payload,
      ...payload
    });
  } catch (err) {
    logger.error('Error generating AI marketing copies: ' + err.message);
    next(err);
  }
};
