import logger from '../../../shared/logger/logger.js';

export class OpenRouterProvider {
  static MODEL = process.env.OPEN_ROUTER_MODEL || 'google/gemma-4-26b-a4b-it:free';
  static API_URL = 'https://openrouter.ai/api/v1/chat/completions';

  static async generate(systemPrompt, history, contextJson, userQuery) {
    const apiKey = process.env.OPEN_ROUTER_API_KEY;
    const startTime = Date.now();
    logger.info(`OpenRouterProvider: Calling model ${this.MODEL}...`);

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nSYSTEM CONTEXT DATA:\n${contextJson}\n\nUse this context to ground your answers strictly.`
      }
    ];

    for (const msg of history) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      });
    }

    messages.push({
      role: 'user',
      content: userQuery
    });

    const response = await fetch(this.API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
        'X-Title': 'BitylGlow AI Copilot'
      },
      body: JSON.stringify({
        model: this.MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenRouter API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      throw new Error('OpenRouter returned empty response');
    }

    logger.info(`OpenRouterProvider: Success in ${Date.now() - startTime}ms`);
    return text;
  }
}
