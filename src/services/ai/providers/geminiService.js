import logger from '../../../shared/logger/logger.js';
import AiQueryLog from '../../../models/AiQueryLog.js';
import { GeminiProvider } from './geminiProvider.js';
import { OllamaProvider } from './ollamaProvider.js';
import { OpenRouterProvider } from './openRouterProvider.js';
import { MockProvider } from './mockProvider.js';

export class GeminiService {
  static async generateResponse(systemPrompt, history, contextJson, userQuery, userId = null) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const ollamaKey = process.env.OLLAMA_API_KEY;
    const openRouterKey = process.env.OPEN_ROUTER_API_KEY;

    const isGeminiKey = geminiKey && geminiKey !== 'MOCK_KEY' && geminiKey.startsWith('AIzaSy');
    const isOpenRouter = !isGeminiKey && openRouterKey && (openRouterKey.startsWith('sk-or-') || openRouterKey.includes('-or-v1-'));
    const isOllamaKey = !isGeminiKey && !isOpenRouter && (ollamaKey || (geminiKey && geminiKey !== 'MOCK_KEY'));
    const isMock = !isGeminiKey && !isOpenRouter && !isOllamaKey;
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeQueriesCount = await AiQueryLog.countDocuments({
        createdAt: { $gte: oneDayAgo },
        isEmulated: false
      });

      if (activeQueriesCount >= 100) {
        logger.warn(`GeminiService: Cost protection triggered (${activeQueriesCount}/100 in 24h). Emulating response locally.`);
        const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
        await AiQueryLog.create({ userId, query: userQuery, response: emulated, isEmulated: true });
        return emulated;
      }
    } catch (dbErr) {
      logger.error('GeminiService: Failed checking logs count:', dbErr);
    }

    if (isMock) {
      logger.info('Using locally-emulated model inference — no AI API key configured.');
      const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
      await AiQueryLog.create({ userId, query: userQuery, response: emulated, isEmulated: true });
      return emulated;
    }

    if (isOpenRouter) {
      try {
        logger.info('GeminiService: Using OpenRouter provider.');
        const text = await OpenRouterProvider.generate(systemPrompt, history, contextJson, userQuery);
        await AiQueryLog.create({ userId, query: userQuery, response: text, isEmulated: false });
        return text;
      } catch (err) {
        logger.error(`OpenRouter failed: ${err.message}. Falling back to emulation.`);
        const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
        await AiQueryLog.create({ userId, query: userQuery, response: emulated, isEmulated: true });
        return emulated;
      }
    }

    if (isOllamaKey) {
      try {
        logger.info('GeminiService: Using Ollama provider.');
        const text = await OllamaProvider.generate(systemPrompt, history, contextJson, userQuery);
        await AiQueryLog.create({ userId, query: userQuery, response: text, isEmulated: false });
        return text;
      } catch (err) {
        logger.error(`Ollama mode failed: ${err.message}. Falling back to emulation.`);
        const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
        await AiQueryLog.create({ userId, query: userQuery, response: emulated, isEmulated: true });
        return emulated;
      }
    }

    try {
      logger.info('GeminiService: Using Google Gemini provider.');
      const text = await GeminiProvider.generate(systemPrompt, history, contextJson, userQuery);
      await AiQueryLog.create({ userId, query: userQuery, response: text, isEmulated: false });
      return text;
    } catch (error) {
      logger.error(`Gemini API failed: ${error.message}. Falling back to emulation.`);
      const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
      await AiQueryLog.create({ userId, query: userQuery, response: emulated, isEmulated: true });
      return emulated;
    }
  }
}
