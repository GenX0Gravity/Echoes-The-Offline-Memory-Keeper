/**
 * Vercel Serverless Function: POST /api/ofrenda/message
 */
import { ollama } from '../../server/ollamaClient.js';
import { buildOfrendaMessagePrompt } from '../../server/prompts.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ollama-host');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { name, birthYear, passYear, emoji, favorites, traits, tone = 'emotional', model, host } = req.body || {};
  const targetHost = req.headers['x-ollama-host'] || host || ollama.host;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Honoree name is required.' });
  }

  const status = await ollama.getStatus(targetHost);
  if (!status.connected) {
    return res.status(503).json({
      error: status.error,
      offline: true,
      hint: 'Ollama is offline. The app will use the built-in remembrance template.',
    });
  }

  const { systemPrompt, userPrompt } = buildOfrendaMessagePrompt({
    name: name.trim(),
    birthYear,
    passYear,
    emoji,
    favorites,
    traits,
    tone,
  });

  const result = await ollama.generate({
    prompt: userPrompt,
    system: systemPrompt,
    model: model || ollama.model,
    host: targetHost,
    temperature: 0.7,
  });

  if (!result.success) {
    return res.status(500).json({
      error: result.error,
      model: result.model,
    });
  }

  let cleanedMessage = result.text.trim();
  if (cleanedMessage.startsWith('"') && cleanedMessage.endsWith('"')) {
    cleanedMessage = cleanedMessage.slice(1, -1).trim();
  }

  return res.status(200).json({
    success: true,
    message: cleanedMessage,
    model: result.model,
    tone,
  });
}

