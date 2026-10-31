/**
 * ECHOES – Vercel Serverless Function Dispatcher
 * Bridges Vercel serverless calls to the Express AI router.
 */

import express from 'express';
import cors from 'cors';
import { aiRouter } from '../server/routes/ai.js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-ollama-host']
}));

app.use(express.json({ limit: '10mb' }));

// Handle both /api/* and direct router paths
app.use('/api', aiRouter);
app.use('/', aiRouter);

export default app;

