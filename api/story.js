/**
 * Vercel Serverless Function: POST /api/story
 */
import { ollama } from '../server/ollamaClient.js';
import { buildStoryPrompt } from '../server/prompts.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ollama-host');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { memoryContent, tone = 'poetic', memoryTitle = '', model, host } = req.body || {};
  const targetHost = req.headers['x-ollama-host'] || host || ollama.host;

  if (!memoryContent || typeof memoryContent !== 'string' || memoryContent.trim().length < 10) {
    return res.status(400).json({
      error: 'Please provide at least 10 characters describing your memory.',
    });
  }

  const status = await ollama.getStatus(targetHost);
  if (!status.connected) {
    return res.status(503).json({
      error: status.error,
      offline: true,
      hint: 'Ollama is offline. You can start it with "ollama serve" and pull the default model with "ollama run qwen2.5:3b".',
    });
  }

  const { systemPrompt, userPrompt } = buildStoryPrompt(memoryContent.trim(), tone, memoryTitle);

  const result = await ollama.generate({
    prompt: userPrompt,
    system: systemPrompt,
    model: model || ollama.model,
    host: targetHost,
    temperature: 0.75,
  });

  if (!result.success) {
    return res.status(500).json({
      error: result.error,
      model: result.model,
      hint: result.error?.includes('not found')
        ? `Model "${result.model}" is not installed locally. Run "ollama run ${result.model}" in your terminal.`
        : undefined,
    });
  }

  return res.status(200).json({
    success: true,
    story: result.text,
    model: result.model,
    tone,
    durationMs: result.totalDuration ? Math.round(result.totalDuration / 1000000) : null,
  });
}

