import logger from '../../../shared/logger/logger.js';
import AiQueryLog from '../../../models/AiQueryLog.js';
import { GeminiProvider } from './geminiProvider.js';
import { OllamaProvider } from './ollamaProvider.js';
import { MockProvider } from './mockProvider.js';

export class GeminiService {
  static async generateResponse(systemPrompt, history, contextJson, userQuery, userId = null) {
    const apiKey = process.env.GEMINI_API_KEY;
    const isMock = !apiKey || apiKey === 'MOCK_KEY';

    // 1. Cost protection check (Max 100 queries/24 hours)
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeQueriesCount = await AiQueryLog.countDocuments({ 
        createdAt: { $gte: oneDayAgo },
        isEmulated: false 
      });

      if (activeQueriesCount >= 100) {
        logger.warn(`GeminiService: Cost protection triggered (${activeQueriesCount}/100 in 24h). Emulating response locally.`);
        const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
        await AiQueryLog.create({
          userId,
          query: userQuery,
          response: emulated,
          isEmulated: true
        });
        return emulated;
      }
    } catch (dbErr) {
      logger.error('GeminiService: Failed checking logs count:', dbErr);
    }

    // 2. Emulated fallback check
    if (isMock) {
      logger.info('Using locally-emulated model inference fallback due to missing GEMINI_API_KEY.');
      const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
      await AiQueryLog.create({
        userId,
        query: userQuery,
        response: emulated,
        isEmulated: true
      });
      return emulated;
    }

    // 3. Select API mode: Ollama vs. Google Gemini
    const isGeminiKey = apiKey.startsWith('AIzaSy');

    if (!isGeminiKey) {
      // Ollama Mode
      try {
        const text = await OllamaProvider.generate(systemPrompt, history, contextJson, userQuery);
        await AiQueryLog.create({
          userId,
          query: userQuery,
          response: text,
          isEmulated: false
        });
        return text;
      } catch (err) {
        logger.error(`Ollama mode failed: ${err.message}. Falling back to emulation.`);
        const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
        await AiQueryLog.create({
          userId,
          query: userQuery,
          response: emulated,
          isEmulated: true
        });
        return emulated;
      }
    }

    // Google Gemini Mode
    try {
      const text = await GeminiProvider.generate(systemPrompt, history, contextJson, userQuery);
      await AiQueryLog.create({
        userId,
        query: userQuery,
        response: text,
        isEmulated: false
      });
      return text;
    } catch (error) {
      logger.error(`Gemini API failed: ${error.message}. Falling back to emulation.`);
      const emulated = MockProvider.generate(systemPrompt, history, contextJson, userQuery);
      await AiQueryLog.create({
        userId,
        query: userQuery,
        response: emulated,
        isEmulated: true
      });
      return emulated;
    }
  }
}
