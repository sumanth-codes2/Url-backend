import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './database/db.js';
import logger from './shared/logger/logger.js';
import Url from './models/Url.js';
import Notification from './models/Notification.js';

dotenv.config();

const requiredEnv = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  logger.error('CRITICAL CONFIGURATION ERROR: Missing required environment variable(s): ' + missingEnv.join(', '));
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

connectDB();

const startBrokenLinkMonitor = () => {
  setInterval(async () => {
    try {
      logger.info('AI Broken Link Monitor: Initiating periodic crawler scans...');
      const urls = await Url.find({ isArchived: false, creator: { $exists: true, $ne: null } });
      
      for (const url of urls) {
        if (url.originalUrl.includes('localhost') || url.originalUrl.includes('127.0.0.1')) continue;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        let ok = false;
        
        try {
          const res = await fetch(url.originalUrl, { method: 'HEAD', signal: controller.signal });
          ok = res.status >= 200 && res.status < 400;
          clearTimeout(timeoutId);
        } catch (e) {
          clearTimeout(timeoutId);
          ok = false;
        }

        if (!ok) {
          const exists = await Notification.findOne({
            user: url.creator,
            title: `Broken Link Warning: /${url.shortCode}`
          });

          if (!exists) {
            const notif = new Notification({
              user: url.creator,
              title: `Broken Link Warning: /${url.shortCode}`,
              message: `Your destination link "${url.originalUrl}" is returning connection failures or DNS errors. Please update it.`,
              type: 'system',
              read: false
            });
            await notif.save();
            logger.warn(`AI Broken Link Monitor: Registered broken warning alert for link /${url.shortCode}`);
          }
        }
      }
    } catch (err) {
      logger.error('Broken Link Monitor failure: ' + err.message);
    }
  }, 60000);
};

app.listen(PORT, () => {
  logger.info(`Enterprise URL Platform Server active on port: ${PORT}`);
  logger.info(`Swagger API Docs available at: http://localhost:${PORT}/api-docs`);
  startBrokenLinkMonitor();
});
