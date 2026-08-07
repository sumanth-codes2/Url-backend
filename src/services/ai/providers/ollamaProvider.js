import logger from '../../../shared/logger/logger.js';

export class OllamaProvider {
  static async generate(systemPrompt, history, contextJson, userQuery) {
    const apiKey = process.env.OLLAMA_API_KEY;
    const model = process.env.OLLAMA_MODEL || 'gpt-oss:20b';
    const endpoints = [
      { url: 'https://ollama.com/api/chat', headers: { 'Authorization': `Bearer ${apiKey}` } },
      { url: 'http://localhost:11434/api/chat', headers: {} }
    ];

    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\nSYSTEM CONTEXT DATA:\n${contextJson}\n\nUse this context to ground your answers.`
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

    for (const endpoint of endpoints) {
      try {
        logger.info(`OllamaProvider: Attempting call to ${endpoint.url} with model ${model}`);

        const response = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...endpoint.headers
          },
          body: JSON.stringify({
            model,
            messages,
            stream: false
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.message?.content || data.response || '';
          if (text) {
            logger.info(`OllamaProvider: Success from ${endpoint.url}`);
            return text;
          }
        } else {
          const errText = await response.text();
          logger.warn(`Ollama call to ${endpoint.url} returned status ${response.status}: ${errText}`);
        }
      } catch (err) {
        logger.warn(`Ollama call to ${endpoint.url} failed: ${err.message}`);
      }
    }

    throw new Error('All Ollama endpoints failed.');
  }
}
