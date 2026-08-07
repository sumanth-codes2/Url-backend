import { GoogleGenAI } from '@google/genai';
import logger from '../../../shared/logger/logger.js';

export class GeminiProvider {
  static ai = null;
  static modelName = 'gemini-2.0-flash';

  static getClient() {
    if (!this.ai) {
      const apiKey = process.env.GEMINI_API_KEY || 'MOCK_KEY';
      this.ai = new GoogleGenAI({ apiKey });
    }
    return this.ai;
  }

  static async generate(systemPrompt, history, contextJson, userQuery) {
    const startTime = Date.now();
    logger.info('GeminiProvider invoking official Google Gemini API...');

    const client = this.getClient();
    const contents = [];

    contents.push({
      role: 'user',
      parts: [{ text: 'SYSTEM CONTEXT DATA:\n' + contextJson + '\n\nUse this data to ground your answers.' }]
    });

    contents.push({
      role: 'model',
      parts: [{ text: "Understood. I will ground my business intelligence analysis strictly in the provided JSON data." }]
    });

    for (const msg of history) {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: userQuery }]
    });

    const response = await client.models.generateContent({
      model: this.modelName,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2
      }
    });

    const text = response.text || '';
    logger.info(`Gemini API call completed successfully in ${Date.now() - startTime}ms`);
    return text;
  }
}
