/**
 * Vercel Serverless Function: POST /api/chat
 */
import { ollama } from '../server/ollamaClient.js';
import { buildCompanionSystemPrompt } from '../server/prompts.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ollama-host');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { messages, tone = 'emotional', model, host } = req.body || {};
  const targetHost = req.headers['x-ollama-host'] || host || ollama.host;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'Please provide an array of conversation messages.',
    });
  }

  const status = await ollama.getStatus(targetHost);
  if (!status.connected) {
    return res.status(503).json({
      error: status.error,
      offline: true,
      hint: 'Ollama is offline. The app will use the built-in offline engine.',
    });
  }

  const systemPrompt = buildCompanionSystemPrompt(tone);

  const result = await ollama.chat({
    messages,
    system: systemPrompt,
    model: model || ollama.model,
    host: targetHost,
    temperature: 0.8,
  });

  if (!result.success) {
    return res.status(500).json({
      error: result.error,
      model: result.model,
      hint: result.error?.includes('not found')
        ? `Model "${result.model}" is not installed. Run "ollama run ${result.model}".`
        : undefined,
    });
  }

  return res.status(200).json({
    success: true,
    reply: result.message,
    model: result.model,
    durationMs: result.totalDuration ? Math.round(result.totalDuration / 1000000) : null,
  });
}

