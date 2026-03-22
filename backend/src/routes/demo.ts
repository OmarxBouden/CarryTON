import { Router, Request, Response } from 'express';
import db from '../db';
import { execSync } from 'child_process';
import path from 'path';
import { isLLMAvailable } from '../services/llm';

const router = Router();

// GET /demo/reset — re-run the seed script to reset all data
router.get('/reset', (_req: Request, res: Response) => {
  try {
    execSync('npx ts-node src/seed.ts', {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
    });
    return res.json({ status: 'ok', message: 'Database reset to seed state' });
  } catch (err) {
    console.error('[demo/reset]', err);
    return res.status(500).json({ error: 'Reset failed' });
  }
});

// GET /demo/status — entity counts
router.get('/status', (_req: Request, res: Response) => {
  const ALLOWED_TABLES = ['users', 'trips', 'requests', 'matches', 'match_hops', 'reviews', 'user_badges'] as const;
  const count = (table: typeof ALLOWED_TABLES[number]) =>
    (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as any).c;

  return res.json({
    users: count('users'),
    trips: count('trips'),
    requests: count('requests'),
    matches: count('matches'),
    match_hops: count('match_hops'),
    reviews: count('reviews'),
    user_badges: count('user_badges'),
  });
});

// GET /demo/ai — check LLM status
router.get('/ai', async (_req: Request, res: Response) => {
  const llm = await isLLMAvailable();
  return res.json({
    provider: llm.provider,
    model: llm.model,
    note: `Using ${llm.provider} (${llm.model}). Algorithmic fallback always available.`,
  });
});

export default router;
