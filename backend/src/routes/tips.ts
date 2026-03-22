import { Router, Request, Response } from 'express';
import db from '../db';
import { XP_REWARDS } from '../../../shared/types';
import { notifyUser } from '../services/notify';
import { callLLM } from '../services/llm-provider';

const router = Router();

// POST /tips — record a tip
router.post('/', (req: Request, res: Response) => {
  const { match_id, tipper_id, carrier_id, amount_ton, ai_suggested } = req.body;

  if (!match_id || !tipper_id || !carrier_id || !amount_ton || amount_ton <= 0) {
    return res.status(400).json({ error: 'match_id, tipper_id, carrier_id, and amount_ton (>0) are required' });
  }

  // Verify match exists and is confirmed
  const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(match_id) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });
  if (match.status !== 'confirmed') return res.status(400).json({ error: 'Can only tip on confirmed deliveries' });

  // Check not already tipped
  const existing = db.prepare(`SELECT 1 FROM tips WHERE match_id = ? AND tipper_id = ?`).get(match_id, tipper_id);
  if (existing) return res.status(400).json({ error: 'Already tipped for this delivery' });

  // Record the tip
  const result = db.prepare(`
    INSERT INTO tips (match_id, tipper_id, carrier_id, amount_ton, ai_suggested)
    VALUES (?, ?, ?, ?, ?)
  `).run(match_id, tipper_id, carrier_id, Math.round(amount_ton * 100) / 100, ai_suggested ? 1 : 0);

  const tip = db.prepare(`SELECT * FROM tips WHERE id = ?`).get(result.lastInsertRowid);

  // Award XP (COALESCE handles null xp)
  db.prepare(`UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?`).run(XP_REWARDS.tip_given, tipper_id);
  db.prepare(`UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?`).run(XP_REWARDS.tip_received, carrier_id);

  // Check badges
  const new_badges: string[] = [];

  // Generous tipper: 5+ tips given
  const tipCount = (db.prepare(`SELECT COUNT(*) as c FROM tips WHERE tipper_id = ?`).get(tipper_id) as any).c;
  if (tipCount >= 5) {
    const has = db.prepare(`SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = 'generous-tipper'`).get(tipper_id);
    if (!has) {
      db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, 'generous-tipper')`).run(tipper_id);
      new_badges.push('generous-tipper');
    }
  }

  // Fan favorite: 2+ tips received (lowered from 10 for demo)
  const receivedCount = (db.prepare(`SELECT COUNT(*) as c FROM tips WHERE carrier_id = ?`).get(carrier_id) as any).c;
  if (receivedCount >= 2) {
    const has = db.prepare(`SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = 'fan-favorite'`).get(carrier_id);
    if (!has) {
      db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, 'fan-favorite')`).run(carrier_id);
      new_badges.push('fan-favorite');
    }
  }

  // Notify carrier (non-fatal)
  try {
    const tipper = db.prepare(`SELECT display_name FROM users WHERE id = ?`).get(tipper_id) as any;
    const carrier = db.prepare(`SELECT telegram_id FROM users WHERE id = ?`).get(carrier_id) as any;
    if (carrier?.telegram_id) {
      notifyUser(carrier.telegram_id, `💰 ${tipper?.display_name || 'Someone'} tipped you ${amount_ton} TON! Great job!`);
    }
  } catch (e) {
    console.error('Tip notification error (non-fatal):', e);
  }

  return res.status(201).json({
    tip,
    xp_awarded: { tipper: XP_REWARDS.tip_given, carrier: XP_REWARDS.tip_received },
    new_badges,
  });
});

// POST /tips/suggest — AI-powered tip suggestion
router.post('/suggest', async (req: Request, res: Response) => {
  const { match_id } = req.body;

  if (!match_id) return res.status(400).json({ error: 'match_id is required' });

  const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(match_id) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const hops = db.prepare(`
    SELECT mh.*, u.display_name as carrier_name, u.reputation
    FROM match_hops mh JOIN users u ON mh.carrier_id = u.id
    WHERE mh.match_id = ? ORDER BY mh.hop_order
  `).all(match_id) as any[];

  const request = db.prepare(`SELECT * FROM requests WHERE id = ?`).get(match.request_id) as any;

  const carrierNames = hops.map((h: any) => h.carrier_name).join(' and ');
  const route = hops.length > 0
    ? `${hops[0].from_city} → ${hops[hops.length - 1].to_city}`
    : 'unknown route';
  const avgRep = hops.reduce((s: number, h: any) => s + (h.reputation || 4.5), 0) / (hops.length || 1);

  // Default suggestion without LLM
  const baseFee = match.total_fee_ton || 5;
  const defaultAmount = Math.round(baseFee * 0.15 * 10) / 10; // ~15% of delivery fee
  const defaultReasoning = `A typical tip for this route is around ${defaultAmount} TON (about 15% of the delivery fee). ${carrierNames} delivered your package safely.`;

  try {
    const system = `You are CarryTON's tipping advisor. Suggest a fair tip amount for a package delivery. Be brief (2-3 sentences max). Be conversational and warm. Don't use emojis. Return ONLY valid JSON.`;

    const prompt = `Delivery details:
- Route: ${route}
- Carrier(s): ${carrierNames}
- Carrier rating: ${avgRep.toFixed(1)}★
- Delivery fee paid: ${match.total_fee_ton} TON
- Package: ${request?.package_size || 'standard'}, ${request?.urgency || 'normal'} priority
- Hops: ${hops.length}

Return JSON: { "suggested_amount": number, "reasoning": "brief explanation" }`;

    const raw = await callLLM(system, prompt);
    const parsed = JSON.parse(raw);

    return res.json({
      suggested_amount: Math.round((parsed.suggested_amount || defaultAmount) * 10) / 10,
      reasoning: parsed.reasoning || defaultReasoning,
      carrier_names: carrierNames,
    });
  } catch {
    // Fallback to formula-based suggestion
    return res.json({
      suggested_amount: defaultAmount,
      reasoning: defaultReasoning,
      carrier_names: carrierNames,
    });
  }
});

// GET /tips/match/:matchId — check if already tipped
router.get('/match/:matchId', (req: Request, res: Response) => {
  const tip = db.prepare(`SELECT * FROM tips WHERE match_id = ?`).get(req.params.matchId);
  return res.json({ tip: tip || null });
});

export default router;
