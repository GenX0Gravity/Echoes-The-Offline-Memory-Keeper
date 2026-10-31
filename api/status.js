/**
 * Vercel Serverless Function: GET /api/status
 */
import { ollama } from '../server/ollamaClient.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-ollama-host');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetHost = req.headers['x-ollama-host'] || req.query.host || ollama.host;
  const status = await ollama.getStatus(targetHost);
  return res.status(200).json(status);
}

