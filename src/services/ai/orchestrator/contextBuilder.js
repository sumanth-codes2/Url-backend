import logger from '../../../shared/logger/logger.js';
import { AITools } from '../tools/aiTools.js';
import { ServiceRegistry } from '../../serviceRegistry.js';
import Url from '../../../models/Url.js';
import Folder from '../../../models/Folder.js';
import Workspace from '../../../models/Workspace.js';
import User from '../../../models/User.js';

export class ContextBuilder {
  static async buildContext(intent, urls, targetUrl, urlIds, userId = null, classification = {}) {
    const startTime = Date.now();
    logger.info('ContextBuilder constructing payload for intent: ' + intent);

    let data = {
      timestamp: new Date().toISOString(),
      intent,
      isDatabaseQuery: false
    };

    // Helper to get active workspace id if not available
    let activeWorkspaceId = null;
    if (userId) {
      try {
        const user = await User.findById(userId);
        if (user) activeWorkspaceId = user.activeWorkspace;
      } catch (err) {
        logger.error('ContextBuilder: Error resolving user active workspace: ' + err.message);
      }
    }

    // Process database and public crawler intents
    switch (intent) {
      case 'PUBLIC_WEBSITE_ANALYSIS': {
        data.isPublicWebsite = true;
        const targetUrlText = classification.targetUrlText;
        if (targetUrlText) {
          try {
            const parsedUrl = new URL(targetUrlText);
            const hostname = parsedUrl.hostname.toLowerCase();
            
            // Check if hostname is local or private
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');
            
            if (isLocal) {
              data.isAuthProtected = true;
              data.authReason = 'This URL belongs to an internal, local, or private network resource that is not accessible from the public internet.';
              data.websiteSummary = { url: targetUrlText };
              break;
            }

            // Perform reachability and auth check
            let statusCode = 200;
            let isAuthProtected = false;
            let authReason = '';
            
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 4000);
              const testRes = await fetch(targetUrlText, { 
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0 BitylGlow/2.0 ReachabilityScanner' },
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              statusCode = testRes.status;
              if (statusCode === 401 || statusCode === 403) {
                isAuthProtected = true;
                authReason = `The destination server returned an HTTP status code of ${statusCode} (${statusCode === 401 ? 'Unauthorized' : 'Forbidden'}), indicating that access is authentication-protected.`;
              }
            } catch (err) {
              logger.warn(`ContextBuilder: Public check failed for ${targetUrlText}: ${err.message}`);
            }

            if (isAuthProtected) {
              data.isAuthProtected = true;
              data.authReason = authReason;
              data.websiteSummary = { url: targetUrlText };
              break;
            }

            // Run standard crawler and security audit from specialized services
            logger.info(`ContextBuilder: Crawling public website: ${targetUrlText}`);
            
            const intelligenceService = ServiceRegistry.get('WebsiteIntelligenceService');
            const securityService = ServiceRegistry.get('SecurityAIService');
            
            const intelligence = await intelligenceService.analyzeWebsite(targetUrlText);
            const securityCheck = await securityService.detectPhishing(targetUrlText);
            const healthReport = await securityService.calculateLinkHealth(targetUrlText, true);

            data.websiteSummary = {
              url: targetUrlText,
              title: intelligence.title || 'Untitled Web Page',
              description: intelligence.description || 'No page description metadata found.',
              category: intelligence.category || 'Technology',
              tags: intelligence.tags || [],
              summary: intelligence.summary || '',
              readingTime: intelligence.readingTime || 1,
              healthScore: healthReport.score || 100,
              healthDetails: healthReport.details || '',
              safetyScore: securityCheck.score || 100,
              safetyVerdict: securityCheck.details || 'Clean. No security threats or phishing signatures resolved.'
            };
          } catch (urlErr) {
            data.error = `Invalid URL format: ${targetUrlText}. Ensure it matches standard HTTP protocol layouts.`;
          }
        } else {
          data.error = 'No target URL found in the query context.';
        }
        break;
      }

      case 'DB_YOUTUBE_LINKS': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const records = await Url.find({ workspace: activeWorkspaceId, originalUrl: /youtube\.com|youtu\.be/i, isArchived: false });
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || 'Untitled YouTube Link',
            clicks: r.clicks,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No active workspace found to run YouTube query.';
        }
        break;
      }

      case 'DB_GITHUB_LINKS': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const records = await Url.find({ workspace: activeWorkspaceId, originalUrl: /github\.com/i, isArchived: false });
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || 'Untitled GitHub Link',
            clicks: r.clicks,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No active workspace found to run GitHub query.';
        }
        break;
      }

      case 'DB_MOST_CLICKED': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const records = await Url.find({ workspace: activeWorkspaceId, isArchived: false }).sort({ clicks: -1 }).limit(5);
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || r.shortCode,
            clicks: r.clicks,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No active workspace found to run popularity query.';
        }
        break;
      }

      case 'DB_EXPIRED_LINKS': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const now = new Date();
          const records = await Url.find({ workspace: activeWorkspaceId, expiresAt: { $lt: now }, isArchived: false });
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || r.shortCode,
            clicks: r.clicks,
            expiresAt: r.expiresAt
          }));
        } else {
          data.error = 'No active workspace found to run expired query.';
        }
        break;
      }

      case 'DB_ZERO_CLICK_LINKS': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const records = await Url.find({ workspace: activeWorkspaceId, clicks: 0, isArchived: false });
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || r.shortCode,
            clicks: r.clicks,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No active workspace found to run zero-clicks query.';
        }
        break;
      }

      case 'DB_CREATED_TODAY': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const records = await Url.find({ workspace: activeWorkspaceId, createdAt: { $gte: startOfToday }, isArchived: false });
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || r.shortCode,
            clicks: r.clicks,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No active workspace found to run todays-links query.';
        }
        break;
      }

      case 'DB_WORKSPACES': {
        data.isDatabaseQuery = true;
        if (userId) {
          const records = await Workspace.find({ 
            $or: [
              { owner: userId }, 
              { 'members.user': userId }
            ] 
          }).populate('owner', 'username email');
          data.queryResult = records.map(r => ({
            workspaceId: r._id,
            name: r.name,
            owner: r.owner?.username || 'Unknown',
            membersCount: r.members.length,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No userId provided to run workspaces query.';
        }
        break;
      }

      case 'DB_FOLDERS': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const records = await Folder.find({ workspace: activeWorkspaceId });
          data.queryResult = records.map(r => ({
            folderId: r._id,
            name: r.name,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No active workspace found to run folders query.';
        }
        break;
      }

      case 'DB_PASSWORD_PROTECTED': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const records = await Url.find({ 
            workspace: activeWorkspaceId, 
            isArchived: false,
            $or: [
              { isPasswordProtected: true },
              { password: { $ne: null, $ne: '' } }
            ]
          });
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || r.shortCode,
            clicks: r.clicks,
            isPasswordProtected: true
          }));
        } else {
          data.error = 'No active workspace found to run password-protected query.';
        }
        break;
      }

      case 'DB_GENERIC_DOMAIN_SEARCH': {
        data.isDatabaseQuery = true;
        const keyword = classification.domainKeyword;
        if (activeWorkspaceId && keyword) {
          const records = await Url.find({ 
            workspace: activeWorkspaceId, 
            originalUrl: new RegExp(keyword, 'i'), 
            isArchived: false 
          });
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || r.shortCode,
            clicks: r.clicks,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No active workspace or search keyword resolved to run domain query.';
        }
        break;
      }

      case 'DB_ALL_LINKS': {
        data.isDatabaseQuery = true;
        if (activeWorkspaceId) {
          const records = await Url.find({ workspace: activeWorkspaceId, isArchived: false });
          data.queryResult = records.map(r => ({
            originalUrl: r.originalUrl,
            shortUrl: `http://localhost:5000/r/${r.shortCode}`,
            shortCode: r.shortCode,
            title: r.title || r.shortCode,
            clicks: r.clicks,
            createdAt: r.createdAt
          }));
        } else {
          data.error = 'No active workspace found to run all-links query.';
        }
        break;
      }

      // Legacy fallback analytical intents
      case 'DASHBOARD_ANALYSIS':
      case 'WORKSPACE_SUMMARY': {
        const stats = await AITools.fetchAnalyticsSummary(urlIds);
        data.workspaceSummary = {
          totalUrlsCount: urls.length,
          totalClicks: urls.reduce((sum, u) => sum + u.clicks, 0),
          todayClicks: stats.clicksToday,
          todayUniqueUsers: stats.uniqueUsersToday
        };
        data.urls = urls.map(u => ({
          shortCode: u.shortCode,
          title: u.title,
          clicks: u.clicks,
          category: u.category,
          healthScore: u.healthScore
        })).slice(0, 8);
        break;
      }

      case 'SPECIFIC_LINK_QUESTION':
      case 'LINK_ANALYTICS': {
        if (targetUrl) {
          data.selectedLink = AITools.fetchSecurityAudit(targetUrl);
          data.selectedLink.clicks = targetUrl.clicks;
          data.selectedLink.title = targetUrl.title;
          data.selectedLink.category = targetUrl.category;
          data.selectedLink.originalUrl = targetUrl.originalUrl;
        } else {
          data.error = 'No target url resolved from conversational history logs.';
        }
        break;
      }

      case 'PREDICTION': {
        const link = targetUrl || (urls.length > 0 ? [...urls].sort((a,b) => b.clicks - a.clicks)[0] : null);
        if (link) {
          data.selectedLink = AITools.fetchPredictions(link);
          data.selectedLink.shortCode = link.shortCode;
          data.selectedLink.clicks = link.clicks;
        } else {
          data.error = 'No links available to execute regressions forecasts.';
        }
        break;
      }

      case 'MARKETING': {
        const link = targetUrl || (urls.length > 0 ? [...urls].sort((a,b) => b.clicks - a.clicks)[0] : null);
        if (link) {
          data.selectedLink = AITools.fetchMarketingTemplates(link);
        } else {
          data.error = 'No URL target configuration defined for marketing updates.';
        }
        break;
      }

      case 'SECURITY_ANALYSIS':
      case 'WEBSITE_INTELLIGENCE': {
        const link = targetUrl || (urls.length > 0 ? urls[0] : null);
        if (link) {
          data.selectedLink = AITools.fetchSecurityAudit(link);
        } else {
          data.error = 'No URL parameters loaded to run security evaluation.';
        }
        break;
      }

      case 'RECOMMENDATIONS': {
        data.recommendations = AITools.fetchRecommendations(urls);
        break;
      }

      case 'URL_MANAGEMENT': {
        data.brokenLinks = urls.filter(u => u.healthScore < 50).map(u => ({ shortCode: u.shortCode, target: u.originalUrl }));
        data.expiredLinks = urls.filter(u => u.expiresAt && new Date(u.expiresAt) < new Date()).map(u => ({ shortCode: u.shortCode, target: u.originalUrl }));
        break;
      }

      case 'LINK_PERFORMANCE': {
        const sorted = [...urls].sort((a,b) => b.clicks - a.clicks);
        data.performanceList = sorted.map(u => ({
          shortCode: u.shortCode,
          title: u.title,
          clicks: u.clicks,
          category: u.category,
          healthScore: u.healthScore
        })).slice(0, 5);
        break;
      }

      default: {
        data.workspaceUrlsCount = urls.length;
        break;
      }
    }

    const payload = JSON.stringify(data);
    logger.info('ContextBuilder finished compilation in ' + (Date.now() - startTime) + 'ms (payload size: ' + payload.length + ' bytes)');
    return payload;
  }
}
