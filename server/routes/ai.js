/**
 * ECHOES – AI Express Routes
 * Connects the frontend to local Ollama with prompt engineering and error handling.
 */

import { Router } from 'express';
import { ollama } from '../ollamaClient.js';
import {
  TONES,
  buildStoryPrompt,
  buildCompanionSystemPrompt,
  buildOfrendaMessagePrompt,
} from '../prompts.js';

export const aiRouter = Router();

/**
 * GET /api/status
 * Check Ollama connection status, active model, and available local models
 */
aiRouter.get('/status', async (req, res) => {
  const targetHost = req.headers['x-ollama-host'] || req.query.host || ollama.host;
  const status = await ollama.getStatus(targetHost);
  res.json(status);
});

/**
 * POST /api/config
 * Switch active model or host
 */
aiRouter.post('/config', async (req, res) => {
  const { model, host } = req.body;

  if (model) {
    ollama.setModel(model);
  }
  if (host) {
    ollama.setHost(host);
  }

  const updatedStatus = await ollama.getStatus(host || ollama.host);
  res.json({
    success: true,
    activeModel: ollama.model,
    activeHost: ollama.host,
    status: updatedStatus,
  });
});

/**
 * GET /api/tones
 * Returns supported tones
 */
aiRouter.get('/tones', (req, res) => {
  res.json({ tones: TONES });
});

/**
 * POST /api/story
 * Convert user memory into an emotional/poetic story via local Ollama
 */
aiRouter.post('/story', async (req, res) => {
  const { memoryContent, tone = 'poetic', memoryTitle = '', model, host } = req.body;
  const targetHost = req.headers['x-ollama-host'] || host || ollama.host;

  if (!memoryContent || typeof memoryContent !== 'string' || memoryContent.trim().length < 10) {
    return res.status(400).json({
      error: 'Please provide at least 10 characters describing your memory.',
    });
  }

  // Check Ollama status
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
      hint: result.error.includes('not found')
        ? `Model "${result.model}" is not installed locally. Run "ollama run ${result.model}" in your terminal.`
        : undefined,
    });
  }

  res.json({
    success: true,
    story: result.text,
    model: result.model,
    tone,
    durationMs: result.totalDuration ? Math.round(result.totalDuration / 1000000) : null,
  });
});

/**
 * POST /api/chat
 * Memory Companion multi-turn chat with follow-up memory excavation
 */
aiRouter.post('/chat', async (req, res) => {
  const { messages, tone = 'emotional', model, host } = req.body;
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
      hint: result.error.includes('not found')
        ? `Model "${result.model}" is not installed. Run "ollama run ${result.model}".`
        : undefined,
    });
  }

  res.json({
    success: true,
    reply: result.message,
    model: result.model,
    durationMs: result.totalDuration ? Math.round(result.totalDuration / 1000000) : null,
  });
});

/**
 * POST /api/ofrenda/message
 * Generate heartfelt remembrance dedication for Digital Ofrenda cards
 */
aiRouter.post('/ofrenda/message', async (req, res) => {
  const { name, birthYear, passYear, emoji, favorites, traits, tone = 'emotional', model, host } = req.body;
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

  // Clean quotation marks if returned
  let cleanedMessage = result.text.trim();
  if (cleanedMessage.startsWith('"') && cleanedMessage.endsWith('"')) {
    cleanedMessage = cleanedMessage.slice(1, -1).trim();
  }

  res.json({
    success: true,
    message: cleanedMessage,
    model: result.model,
    tone,
  });
});

