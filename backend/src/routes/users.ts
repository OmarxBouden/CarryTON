import { Router, Request, Response } from 'express';
import db from '../db';
import { AVATAR_LEVELS, AvatarState } from '../../shared/types';

const router = Router();

// GET /users/:telegram_id — return user with badges
router.get('/:telegram_id', (req: Request, res: Response) => {
  const user = db.prepare(`
    SELECT * FROM users WHERE telegram_id = ?
  `).get(req.params.telegram_id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const badges = db.prepare(`
    SELECT * FROM user_badges WHERE user_id = ?
  `).all((user as any).id);

  return res.json({ user: { ...(user as any), badges } });
});

// POST /users — upsert user
router.post('/', (req: Request, res: Response) => {
  const { telegram_id, username, display_name } = req.body;

  if (!telegram_id) {
    return res.status(400).json({ error: 'telegram_id is required' });
  }

  const existing = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`).get(telegram_id);

  if (existing) {
    db.prepare(`
      UPDATE users SET username = ?, display_name = ? WHERE telegram_id = ?
    `).run(username ?? (existing as any).username, display_name ?? (existing as any).display_name, telegram_id);
  } else {
    db.prepare(`
      INSERT INTO users (telegram_id, username, display_name) VALUES (?, ?, ?)
    `).run(telegram_id, username ?? null, display_name ?? null);
  }

  const user = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`).get(telegram_id);
  return res.json({ user });
});

// PATCH /users/:id — update wallet_address, display_name, avatar_id
router.patch('/:id', (req: Request, res: Response) => {
  const { wallet_address, display_name, avatar_id } = req.body;
  const { id } = req.params;

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(`
    UPDATE users SET
      wallet_address = COALESCE(?, wallet_address),
      display_name = COALESCE(?, display_name),
      avatar_id = COALESCE(?, avatar_id)
    WHERE id = ?
  `).run(wallet_address ?? null, display_name ?? null, avatar_id ?? null, id);

  const updated = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  return res.json({ user: updated });
});

// GET /users/:id/avatar — return computed AvatarState
router.get('/:id/avatar', (req: Request, res: Response) => {
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.params.id) as any;
  if (!user) return res.status(404).json({ error: 'User not found' });

  const xp = user.xp as number;

  // Find current level
  const levels = AVATAR_LEVELS as readonly { level: number; xp_min: number; name: string; accessory: string | null }[];
  let currentLevel = levels[0];
  for (const lvl of levels) {
    if (xp >= lvl.xp_min) currentLevel = lvl;
  }

  // Find next level
  const nextLevelEntry = levels.find(l => l.level === currentLevel.level + 1);
  const next_level_xp = nextLevelEntry ? nextLevelEntry.xp_min : currentLevel.xp_min;

  const progress_percent = nextLevelEntry
    ? Math.min(100, Math.round(((xp - currentLevel.xp_min) / (nextLevelEntry.xp_min - currentLevel.xp_min)) * 100))
    : 100;

  // Build accessories array (all accessories up to and including current level)
  const accessories = levels
    .filter(l => l.level <= currentLevel.level && l.accessory !== null)
    .map(l => l.accessory as string);

  const avatar: AvatarState = {
    level: currentLevel.level,
    base: currentLevel.level <= 2 ? 'explorer' : currentLevel.level <= 4 ? 'courier' : 'pilot',
    accessories,
    flair: currentLevel.level >= 5 ? 'rainbow' : null,
  };

  return res.json({ avatar, next_level_xp, progress_percent });
});

export default router;
