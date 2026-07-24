import mongoose from 'mongoose';
import { urlRepository } from '../repositories/urlRepository.js';
import { analyticsRepository } from '../repositories/analyticsRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { workspaceRepository } from '../repositories/workspaceRepository.js';
import { AIService } from '../services/ai/orchestrator/aiService.js';
import { AIOrchestrator } from '../services/ai/orchestrator/aiOrchestrator.js';
import { ServiceRegistry } from '../services/serviceRegistry.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../shared/errors/errors.js';
import logger from '../shared/logger/logger.js';

const checkWorkspaceMembership = async (workspaceId, userId) => {
  const ws = await workspaceRepository.findById(workspaceId);
  if (!ws) return false;
  return ws.owner.toString() === userId || ws.members.some(m => m.user.toString() === userId);
};

export const getAnalytics = async (req, res, next) => {
  try {
    const { urlId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(urlId)) {
      throw new BadRequestError('Invalid URL ID');
    }

    const url = await urlRepository.findById(urlId);
    if (!url) {
      throw new NotFoundError('URL not found');
    }
    
    const isOwner = url.creator?.toString() === req.user.id || 
                    (url.workspace && await checkWorkspaceMembership(url.workspace.toString(), req.user.id));
    if (!isOwner) {
      throw new ForbiddenError('Unauthorized access to analytics');
    }

    const analyticsService = ServiceRegistry.get('AnalyticsService');

    const clicksOverTime = await analyticsService.getClicksOverTime(urlId);
    const deviceBreakdown = await analyticsService.getDeviceBreakdown(urlId);
    const countryBreakdown = await analyticsService.getCountryBreakdown(urlId);
    const cityBreakdown = await analyticsService.getCityBreakdown(urlId);
    const referrerBreakdown = await analyticsService.getReferrerBreakdown(urlId);
    const browserBreakdown = await analyticsService.getBrowserBreakdown(urlId);
    const osBreakdown = await analyticsService.getOsBreakdown(urlId);
    const visitorGroups = await analyticsService.getVisitorGroups(urlId);

    let uniqueVisitors = 0;
    let returningVisitors = 0;

    for (const group of visitorGroups) {
      uniqueVisitors++;
      if (group.count > 1) {
        returningVisitors += (group.count - 1);
      }
    }

    const locationLogs = await analyticsService.getLocationLogs(urlId);

    const responseData = {
      url,
      summary: {
        totalClicks: url.clicks,
        uniqueVisitors,
        returningVisitors
      },
      clicksOverTime,
      deviceBreakdown,
      countryBreakdown,
      cityBreakdown,
      referrerBreakdown,
      browserBreakdown,
      osBreakdown,
      locationLogs
    };

    res.json({
      success: true,
      message: 'Analytics compiled successfully',
      data: responseData,
      ...responseData
    });
  } catch (error) {
    next(error);
  }
};

export const getAiInsights = async (req, res, next) => {
  try {
    const { urlId } = req.params;
    const url = await urlRepository.findById(urlId);
    if (!url) {
      throw new NotFoundError('URL not found');
    }

    const referrers = await analyticsRepository.aggregateReferrers(new mongoose.Types.ObjectId(urlId));
    const devices = await analyticsRepository.aggregateDevices(new mongoose.Types.ObjectId(urlId));

    const insightSummary = AIService.summarizeAnalytics(url.clicks, referrers, devices);
    
    res.json({
      success: true,
      message: 'AI insights generated successfully',
      data: { insights: insightSummary },
      insights: insightSummary
    });
  } catch (error) {
    next(error);
  }
};

export const getAiPredictions = async (req, res, next) => {
  try {
    const { urlId } = req.params;
    
    const clicksHistory = await analyticsRepository.aggregateTimeline(new mongoose.Types.ObjectId(urlId));
    const formattedHistory = clicksHistory.map(h => ({ date: h._id, clicks: h.count }));
    const predictions = AIService.predictClickTrends(formattedHistory);
    
    res.json({
      success: true,
      message: 'AI predictions generated successfully',
      data: { predictions },
      predictions
    });
  } catch (error) {
    next(error);
  }
};

export const exportCsv = async (req, res, next) => {
  try {
    const { urlId } = req.params;
    const url = await urlRepository.findById(urlId);
    if (!url) {
      throw new NotFoundError('URL not found');
    }

    const logs = await analyticsRepository.findByUrlId(urlId, 1000);

    let csv = 'Timestamp,Device,Browser,OS,Country,City,Referrer,IPAddress\n';
    
    for (const log of logs) {
      csv += `"${log.timestamp.toISOString()}","${log.device}","${log.browser}","${log.os}","${log.country}","${log.city}","${log.referrer}","${log.ipAddress}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="analytics-${url.shortCode}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

export const chatAnalytics = async (req, res, next) => {
  try {
    const { query, question, history } = req.body;
    const queryText = query || question;
    if (!queryText) {
      throw new BadRequestError('Query text is required');
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const urls = await urlRepository.findByWorkspace(user.activeWorkspace);
    
    const result = await AIOrchestrator.orchestrate(queryText, urls, history || [], req.user.id);
    
    res.json({
      success: true,
      message: 'Chat query executed successfully',
      data: result,
      ...result
    });
  } catch (error) {
    logger.error('Error in chatbot query: ' + error.message);
    next(error);
  }
};
