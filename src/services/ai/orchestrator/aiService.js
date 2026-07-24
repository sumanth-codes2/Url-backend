import { ServiceRegistry } from '../../serviceRegistry.js';

export class AIService {
  static generateMultipleAliases(url) {
    return ServiceRegistry.get('WebsiteIntelligenceService').generateMultipleAliases(url);
  }

  static async detectPhishing(url, htmlContent) {
    return ServiceRegistry.get('SecurityAIService').detectPhishing(url, htmlContent);
  }

  static async calculateLinkHealth(url) {
    return ServiceRegistry.get('SecurityAIService').calculateLinkHealth(url);
  }

  static async analyzeWebsite(url) {
    return ServiceRegistry.get('WebsiteIntelligenceService').analyzeWebsite(url);
  }

  static generateMarketingContent(url, category, title) {
    return ServiceRegistry.get('MarketingAIService').generateMarketingContent(url, category, title);
  }

  static suggestName(url) {
    return ServiceRegistry.get('WebsiteIntelligenceService').suggestName(url);
  }

  static generateRecommendations(urls, analytics) {
    return ServiceRegistry.get('RecommendationAIService').generateRecommendations(urls, analytics);
  }

  static predictClickTrends(clicksTimeline) {
    return ServiceRegistry.get('PredictionAIService').predictClickTrends(clicksTimeline);
  }

  static summarizeAnalytics(clicks, referrers, devices) {
    return ServiceRegistry.get('AnalyticsAIService').summarizeAnalytics(clicks, referrers, devices);
  }
}
