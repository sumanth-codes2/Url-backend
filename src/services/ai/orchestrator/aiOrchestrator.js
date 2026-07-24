import logger from '../../../shared/logger/logger.js';
import { GeminiService } from '../providers/geminiService.js';
import { IntentClassifier } from '../classifier/intentClassifier.js';
import { ContextBuilder } from './contextBuilder.js';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt.js';

export class AIOrchestrator {
  static async orchestrate(queryText, urls, history, userId = null) {
    const startTime = Date.now();
    logger.info(`AIOrchestrator executing orchestrations for query: "${queryText}"`);

    const discussedShortcodes = [];
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      const text = msg.text || '';
      const cardMatches = text.match(/\[LINK_CARD:([a-zA-Z0-9_-]+)\]/g);
      if (cardMatches) {
        cardMatches.forEach((m) => {
          const code = m.slice(11, -1);
          if (!discussedShortcodes.includes(code)) discussedShortcodes.push(code);
        });
      }
      const slashMatches = text.match(/\/([a-zA-Z0-9_-]{6,10})/g);
      if (slashMatches) {
        slashMatches.forEach((m) => {
          const code = m.slice(1);
          if (!discussedShortcodes.includes(code)) discussedShortcodes.push(code);
        });
      }
    }

    const classification = IntentClassifier.classify(queryText, discussedShortcodes, urls);
    const intent = classification.intent;
    const targetUrl = classification.targetUrl;

    const urlIds = urls.map(u => u._id);
    const contextJson = await ContextBuilder.buildContext(intent, urls, targetUrl, urlIds, userId, classification);

    const answer = await GeminiService.generateResponse(SYSTEM_PROMPT, history, contextJson, queryText, userId);

    let chartData = undefined;
    if (intent === 'DASHBOARD_ANALYSIS' || intent === 'WORKSPACE_SUMMARY') {
      chartData = {
        labels: urls.slice(0, 4).map(u => u.title || u.shortCode),
        datasets: [{ data: urls.slice(0, 4).map(u => u.clicks) }]
      };
    } else if (intent === 'SPECIFIC_LINK_QUESTION' && targetUrl) {
      chartData = {
        labels: ['Clicks', 'Health Rating', 'Safety Rating'],
        datasets: [{ data: [targetUrl.clicks, targetUrl.healthScore, targetUrl.safetyScore] }]
      };
    }

    const duration = Date.now() - startTime;
    logger.info(`AIOrchestrator finished query in ${duration}ms:
- Intent: ${intent}
- Tools Target: ${targetUrl ? targetUrl.shortCode : 'Workspace Wide'}
- MongoDB Grounding Payload: ${contextJson.length} bytes`);

    return { answer, chartData };
  }
}
