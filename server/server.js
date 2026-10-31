/**
 * ECHOES – Express Backend Server (Local Development)
 * Serves the vanilla web client and provides endpoints to local Ollama.
 * Strictly local inference; zero external AI APIs.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { aiRouter } from './routes/ai.js';
import { ollama } from './ollamaClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mount local Ollama AI endpoints
app.use('/api', aiRouter);

// Serve static frontend assets from workspace root
app.use(express.static(rootDir));

// Fallback for SPA navigation
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(rootDir, 'index.html'));
  }
  next();
});

// Start listening
app.listen(PORT, async () => {
  console.log('------------------------------------------------------------');
  console.log(`🕯 Echoes – The Offline Memory Keeper is running!`);
  console.log(`✦ Web App:     http://localhost:${PORT}`);
  console.log(`✦ Local Ollama: ${ollama.host}`);
  console.log(`✦ Active Model: ${ollama.model} (default: Qwen2.5 3B)`);
  console.log('------------------------------------------------------------');

  const status = await ollama.getStatus();
  if (status.connected) {
    console.log(`✔ Connected to local Ollama (${status.availableModels.length} models installed)`);
    if (!status.hasModel) {
      console.log(`⚠ Default model "${ollama.model}" is not installed yet.`);
      console.log(`  Run "ollama run ${ollama.model}" to download it.`);
    }
  } else {
    console.log(`ℹ Ollama is not currently running. The app will use the offline demo engine.`);
    console.log(`  To activate local AI: start Ollama with "ollama serve".`);
  }
});

