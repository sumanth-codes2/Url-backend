import Url from '../models/Url.js';
import Analytics from '../models/Analytics.js';
import { GeoIpService } from '../services/geo/geoIpService.js';
import { ServiceRegistry } from '../services/serviceRegistry.js';
import logger from '../shared/logger/logger.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const getDeviceType = (ua) => {
  const uaLower = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/i.test(uaLower)) return 'Tablet';
  if (/mobi|ipod|phone|blackberry|opera mini|iemobile/i.test(uaLower)) return 'Mobile';
  return 'Desktop';
};

const getBrowser = (ua) => {
  const uaLower = ua.toLowerCase();
  if (uaLower.includes('firefox')) return 'Firefox';
  if (uaLower.includes('chrome') && !uaLower.includes('chrome-frame') && !uaLower.includes('chromium')) {
    if (uaLower.includes('edge') || uaLower.includes('edg')) return 'Edge';
    if (uaLower.includes('opr') || uaLower.includes('opera')) return 'Opera';
    return 'Chrome';
  }
  if (uaLower.includes('safari') && !uaLower.includes('chrome') && !uaLower.includes('chromium')) return 'Safari';
  return 'Other';
};

const getOS = (ua) => {
  const uaLower = ua.toLowerCase();
  if (uaLower.includes('windows')) return 'Windows';
  if (uaLower.includes('macintosh') || uaLower.includes('mac os x')) return 'macOS';
  if (uaLower.includes('android')) return 'Android';
  if (uaLower.includes('iphone') || uaLower.includes('ipad') || uaLower.includes('ipod')) return 'iOS';
  if (uaLower.includes('linux')) return 'Linux';
  return 'Other';
};

const getReferrer = (ref) => {
  if (!ref) return 'Direct';
  try {
    const url = new URL(ref);
    return url.hostname.replace('www.', '');
  } catch (e) {
    return 'Other';
  }
};

export const handleRedirect = async (req, res, next) => {
  try {
    const { shortCode } = req.params;

    const url = await Url.findOne({ shortCode });
    if (!url) {
      return res.redirect(`${FRONTEND_URL}?error=not_found`);
    }

    if (url.expiresAt && new Date() > new Date(url.expiresAt)) {
      return res.redirect(`${FRONTEND_URL}/expired`);
    }

    if (url.maxClicks !== null && url.clicks >= url.maxClicks) {
      return res.redirect(`${FRONTEND_URL}/expired`);
    }

    if (url.isPasswordProtected) {
      return res.redirect(`${FRONTEND_URL}/p/${shortCode}`);
    }

    const userAgent = req.headers['user-agent'] || '';
    const referrerHeader = req.headers['referer'] || req.headers['referrer'] || '';
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    
    const geo = await GeoIpService.lookup(ipAddress);

    const routingContext = ServiceRegistry.get('RoutingContext');
    const targetUrl = routingContext.resolveTargetUrl(url, {
      userAgent,
      geo,
      referrer: referrerHeader,
      getDeviceType
    });

    url.clicks += 1;
    
    if (url.creator) {
      const notificationService = ServiceRegistry.get('NotificationService');
      const createNotification = async (milestone) => {
        await notificationService.sendNotification(
          url.creator.toString(),
          'Link Milestone Reached! 🚀',
          `Your shortened link "/${url.shortCode}" has hit ${milestone} total clicks!`,
          'milestone'
        );
        logger.info(`Milestone Notification: Saved ${milestone} clicks event for User: ${url.creator}`);
      };

      if (url.clicks >= 1000 && !url.milestone1000Sent) {
        url.milestone1000Sent = true;
        await createNotification(1000);
      } else if (url.clicks >= 500 && !url.milestone500Sent) {
        url.milestone500Sent = true;
        await createNotification(500);
      } else if (url.clicks >= 100 && !url.milestone100Sent) {
        url.milestone100Sent = true;
        await createNotification(100);
      }
    }

    await url.save();

    const device = getDeviceType(userAgent);
    const browser = getBrowser(userAgent);
    const os = getOS(userAgent);
    const referrer = getReferrer(referrerHeader);

    const alreadyVisited = await Analytics.findOne({ urlId: url._id, ipAddress });
    const isUnique = !alreadyVisited;

    Analytics.create({
      urlId: url._id,
      device,
      browser,
      os,
      country: geo.country,
      countryCode: geo.countryCode,
      stateRegion: geo.stateRegion,
      city: geo.city,
      timezone: geo.timezone,
      latitude: geo.latitude,
      longitude: geo.longitude,
      referrer,
      ipAddress,
      isp: geo.isp,
      isUnique
    }).catch(err => logger.error('Error logging redirection analytics: ' + err.message));

    if (url.isOneTimeUse) {
      url.maxClicks = 1;
      await url.save();
    }

    res.redirect(targetUrl);
  } catch (error) {
    logger.error('Error in redirection controller: ' + error.message);
    next(error);
  }
};
