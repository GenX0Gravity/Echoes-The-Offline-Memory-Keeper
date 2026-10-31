/**
 * Vercel Serverless Function: POST /api/config
 */
import { ollama } from '../server/ollamaClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ollama-host');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { model, host } = req.body || {};

  if (model) {
    ollama.setModel(model);
  }
  if (host) {
    ollama.setHost(host);
  }

  const targetHost = req.headers['x-ollama-host'] || host || ollama.host;
  const updatedStatus = await ollama.getStatus(targetHost);

  return res.status(200).json({
    success: true,
    activeModel: ollama.model,
    activeHost: ollama.host,
    status: updatedStatus,
  });
}

