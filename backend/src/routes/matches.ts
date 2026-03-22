import { Router, Request, Response } from 'express';
import db from '../db';
import { findMatches } from '../services/matching';
import { convertTonToFiat } from './price';
import { XP_REWARDS } from '../../../shared/types';
import { createEscrow, confirmDelivery } from '../services/escrow';
import { notifyUser } from '../services/notify';

const router = Router();

// POST /matches/find — AI matching
router.post('/find', async (req: Request, res: Response) => {
  const { request_id } = req.body;

  if (!request_id) {
    return res.status(400).json({ error: 'request_id is required' });
  }

  try {
    const result = await findMatches(request_id);

    // Compute fiat prices for each match
    const prices = await Promise.all(
      result.matches.map((m) => convertTonToFiat(m.total_fee_ton, 'CHF'))
    );

    // Get current TON price for reference
    let ton_price_usd = 2.80;
    try {
      const priceData = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd'
      ).then((r) => r.json()) as any;
      ton_price_usd = priceData['the-open-network']?.usd || 2.80;
    } catch {
      // fallback already set
    }

    // Store the TOP match as a 'proposed' match in DB
    if (result.matches.length > 0) {
      const topMatch = result.matches[0];

      // Sanitize: ensure all hops have required numeric fields
      for (const hop of topMatch.hops) {
        if (typeof hop.fee_ton !== 'number' || isNaN(hop.fee_ton)) hop.fee_ton = 0;
        if (typeof hop.trip_id !== 'number') hop.trip_id = 0;
        if (typeof hop.carrier_id !== 'number') hop.carrier_id = 0;
        if (!hop.from) hop.from = '';
        if (!hop.to) hop.to = '';
        if (!hop.departure_time) hop.departure_time = new Date().toISOString();
      }
      if (typeof topMatch.total_fee_ton !== 'number' || isNaN(topMatch.total_fee_ton)) {
        topMatch.total_fee_ton = topMatch.hops.reduce((s, h) => s + h.fee_ton, 0);
      }

      const protocolFeeBps = parseInt(process.env.PROTOCOL_FEE_BPS || '500');
      const protocolFee = Math.round(topMatch.total_fee_ton * protocolFeeBps / 10000 * 100) / 100;
      const carrierPayout = Math.round((topMatch.total_fee_ton - protocolFee) * 100) / 100;

      const insertResult = db.prepare(`
        INSERT INTO matches (request_id, status, total_fee_ton, protocol_fee_ton, carrier_payout_ton, ai_reasoning)
        VALUES (?, 'proposed', ?, ?, ?, ?)
      `).run(request_id, topMatch.total_fee_ton, protocolFee, carrierPayout, topMatch.reasoning || 'AI-matched route.');

      const matchId = insertResult.lastInsertRowid as number;

      // Insert match hops
      const insertHop = db.prepare(`
        INSERT INTO match_hops (match_id, hop_order, trip_id, carrier_id, from_city, to_city, departure_time, fee_ton)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < topMatch.hops.length; i++) {
        const hop = topMatch.hops[i];
        insertHop.run(matchId, i + 1, hop.trip_id, hop.carrier_id, hop.from, hop.to, hop.departure_time, hop.fee_ton);
      }

      // Attach match_id to the response for the top match
      (result.matches[0] as any).match_id = matchId;
    }

    return res.json({
      matches: result.matches,
      no_match_reason: result.no_match_reason,
      prices,
      ton_price_usd,
    });
  } catch (err) {
    console.error('[matches/find] Error:', err);
    return res.status(500).json({ error: 'Matching failed', matches: [], prices: [] });
  }
});

// POST /matches/:id/accept
router.post('/:id/accept', (req: Request, res: Response) => {
  const matchId = parseInt(req.params.id as string);
  const { user_id } = req.body;

  const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });

  // Update match status
  db.prepare(`UPDATE matches SET status = 'accepted' WHERE id = ?`).run(matchId);

  // Update request status
  db.prepare(`UPDATE requests SET status = 'matched' WHERE id = ?`).run(match.request_id);

  // Update related trip(s) status
  const hops = db.prepare(`SELECT * FROM match_hops WHERE match_id = ? ORDER BY hop_order`).all(matchId) as any[];
  for (const hop of hops) {
    db.prepare(`UPDATE trips SET status = 'matched' WHERE id = ?`).run(hop.trip_id);
  }

  // Create mock escrow
  const request = db.prepare(`SELECT r.*, u.wallet_address as requester_wallet FROM requests r JOIN users u ON r.requester_id = u.id WHERE r.id = ?`).get(match.request_id) as any;
  const firstCarrier = db.prepare(`SELECT u.wallet_address FROM users u WHERE u.id = ?`).get(hops[0]?.carrier_id) as any;
  const escrow = createEscrow(
    matchId,
    request?.requester_wallet || 'mock_requester',
    firstCarrier?.wallet_address || 'mock_carrier',
    match.total_fee_ton
  );

  // Store escrow ID in match record
  db.prepare(`UPDATE matches SET escrow_address = ? WHERE id = ?`).run(escrow.id, matchId);

  // Notify carrier(s) and requester (non-fatal)
  try {
    const reqUser = db.prepare(`SELECT telegram_id FROM users WHERE id = ?`).get(request?.requester_id) as any;
    for (const hop of hops) {
      const carrier = db.prepare(`SELECT telegram_id, display_name FROM users WHERE id = ?`).get(hop.carrier_id) as any;
      if (carrier?.telegram_id) {
        notifyUser(carrier.telegram_id, `📦 New delivery job! Pick up in ${hop.from_city} heading to ${hop.to_city}. Fee: ${hop.fee_ton} TON`);
      }
      if (reqUser?.telegram_id && carrier?.display_name) {
        notifyUser(reqUser.telegram_id, `✅ ${carrier.display_name} accepted your delivery! Escrow funded with ${match.total_fee_ton} TON`);
      }
    }
  } catch (e) {
    console.error('Notification error (non-fatal):', e);
  }

  const updatedMatch = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId);
  return res.json({ match: updatedMatch, hops });
});

// POST /matches/:id/pickup
router.post('/:id/pickup', (req: Request, res: Response) => {
  const matchId = parseInt(req.params.id as string);
  const { hop_order } = req.body;

  const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });

  // Update hop status
  db.prepare(`UPDATE match_hops SET status = 'picked_up' WHERE match_id = ? AND hop_order = ?`).run(matchId, hop_order);

  // If first hop, update match status to in_transit
  if (hop_order === 1) {
    db.prepare(`UPDATE matches SET status = 'in_transit' WHERE id = ?`).run(matchId);
  }

  // Notify requester (non-fatal)
  try {
    const hop = db.prepare(`SELECT * FROM match_hops WHERE match_id = ? AND hop_order = ?`).get(matchId, hop_order) as any;
    const carrier = db.prepare(`SELECT display_name FROM users WHERE id = ?`).get(hop?.carrier_id) as any;
    const request = db.prepare(`SELECT requester_id FROM requests WHERE id = ?`).get(match.request_id) as any;
    const reqUser = db.prepare(`SELECT telegram_id FROM users WHERE id = ?`).get(request?.requester_id) as any;
    if (reqUser?.telegram_id) {
      notifyUser(reqUser.telegram_id, `🚗 Your package is on the move! ${carrier?.display_name || 'Carrier'} picked up in ${hop?.from_city}`);
    }
  } catch (e) {
    console.error('Notification error (non-fatal):', e);
  }

  const updatedMatch = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId);
  const hops = db.prepare(`SELECT * FROM match_hops WHERE match_id = ? ORDER BY hop_order`).all(matchId);
  return res.json({ match: updatedMatch, hops });
});

// POST /matches/:id/deliver
router.post('/:id/deliver', (req: Request, res: Response) => {
  const matchId = parseInt(req.params.id as string);
  const { hop_order } = req.body;

  const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });

  // Update hop status
  db.prepare(`UPDATE match_hops SET status = 'delivered' WHERE match_id = ? AND hop_order = ?`).run(matchId, hop_order);

  // Check if ALL hops are now delivered
  const pendingHops = db.prepare(`
    SELECT COUNT(*) as count FROM match_hops WHERE match_id = ? AND status != 'delivered'
  `).get(matchId) as any;

  if (pendingHops.count === 0) {
    db.prepare(`UPDATE matches SET status = 'delivered' WHERE id = ?`).run(matchId);

    // Notify requester to confirm (non-fatal)
    try {
      const request = db.prepare(`SELECT requester_id FROM requests WHERE id = ?`).get(match.request_id) as any;
      const reqUser = db.prepare(`SELECT telegram_id FROM users WHERE id = ?`).get(request?.requester_id) as any;
      if (reqUser?.telegram_id) {
        notifyUser(reqUser.telegram_id, `📬 Package arrived! Please confirm delivery in the app to release payment`);
      }
    } catch (e) {
      console.error('Notification error (non-fatal):', e);
    }
  }

  const updatedMatch = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId);
  const hops = db.prepare(`SELECT * FROM match_hops WHERE match_id = ? ORDER BY hop_order`).all(matchId);
  return res.json({ match: updatedMatch, hops });
});

// POST /matches/:id/confirm
router.post('/:id/confirm', (req: Request, res: Response) => {
  const matchId = parseInt(req.params.id as string);
  const { user_id } = req.body;

  const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });

  // Update match status
  db.prepare(`UPDATE matches SET status = 'confirmed' WHERE id = ?`).run(matchId);

  // Update request status
  db.prepare(`UPDATE requests SET status = 'confirmed' WHERE id = ?`).run(match.request_id);

  // Get all hops
  const hops = db.prepare(`SELECT * FROM match_hops WHERE match_id = ? ORDER BY hop_order`).all(matchId) as any[];

  // Update all hops to 'confirmed' and trips to 'completed'
  for (const hop of hops) {
    db.prepare(`UPDATE match_hops SET status = 'confirmed' WHERE match_id = ? AND hop_order = ?`).run(matchId, hop.hop_order);
    db.prepare(`UPDATE trips SET status = 'completed' WHERE id = ?`).run(hop.trip_id);
  }

  // Release mock escrow
  if (match.escrow_address) {
    try {
      confirmDelivery(match.escrow_address, 'carrier');
      confirmDelivery(match.escrow_address, 'requester');
    } catch (err) {
      console.error('[Escrow] Release note:', (err as Error).message);
    }
  }

  // Award XP to carrier(s)
  let carrierXpTotal = 0;
  const new_badges: string[] = [];

  for (const hop of hops) {
    const xpGain = XP_REWARDS.complete_trip_as_carrier;
    carrierXpTotal += xpGain;
    db.prepare(`UPDATE users SET xp = COALESCE(xp, 0) + ?, total_trips = total_trips + 1 WHERE id = ?`).run(xpGain, hop.carrier_id);

    // Check for multi-hop relay bonus
    if (hops.length > 1) {
      db.prepare(`UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?`).run(XP_REWARDS.multi_hop_relay_completed, hop.carrier_id);
      carrierXpTotal += XP_REWARDS.multi_hop_relay_completed;
    }
  }

  // Award XP to requester
  const request = db.prepare(`SELECT * FROM requests WHERE id = ?`).get(match.request_id) as any;
  const requesterXp = XP_REWARDS.complete_delivery_as_requester;
  db.prepare(`UPDATE users SET xp = COALESCE(xp, 0) + ?, total_deliveries = total_deliveries + 1 WHERE id = ?`).run(requesterXp, request.requester_id);

  // Check milestone badges — read AFTER increment so values are current
  const requester = db.prepare(`SELECT * FROM users WHERE id = ?`).get(request.requester_id) as any;

  // ── Badge auto-attribution ──
  // Helper to award a badge if not already earned
  function awardBadge(userId: number, badgeId: string) {
    const has = db.prepare(`SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = ?`).get(userId, badgeId);
    if (!has) {
      db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`).run(userId, badgeId);
      new_badges.push(badgeId);
    }
  }

  for (const hop of hops) {
    const carrier = db.prepare(`SELECT * FROM users WHERE id = ?`).get(hop.carrier_id) as any;
    if (!carrier) continue;

    // first-carry: first delivery as carrier
    if (carrier.total_trips === 1) awardBadge(carrier.id, 'first-carry');

    // lightning-fast: 5+ completed trips
    if (carrier.total_trips >= 5) awardBadge(carrier.id, 'lightning-fast');

    // trusted-carrier: 50+ deliveries with 4.5+ rating
    if (carrier.total_trips >= 50 && carrier.reputation >= 4.5) awardBadge(carrier.id, 'trusted-carrier');

    // relay-master: completed 3+ multi-hop relays
    if (hops.length > 1) {
      const relayCount = (db.prepare(`
        SELECT COUNT(DISTINCT mh.match_id) as c FROM match_hops mh
        JOIN matches m ON mh.match_id = m.id
        WHERE mh.carrier_id = ? AND m.status = 'confirmed'
        AND (SELECT COUNT(*) FROM match_hops WHERE match_id = mh.match_id) > 1
      `).get(carrier.id) as any)?.c || 0;
      if (relayCount >= 3) awardBadge(carrier.id, 'relay-master');
    }

    // pack-mule: carried 10+ large packages
    const largeCount = (db.prepare(`
      SELECT COUNT(*) as c FROM match_hops mh
      JOIN matches m ON mh.match_id = m.id
      JOIN requests r ON m.request_id = r.id
      WHERE mh.carrier_id = ? AND m.status = 'confirmed' AND r.package_size = 'large'
    `).get(carrier.id) as any)?.c || 0;
    if (largeCount >= 10) awardBadge(carrier.id, 'pack-mule');

    // night-owl: 5+ deliveries completed after 10pm
    const nightCount = (db.prepare(`
      SELECT COUNT(*) as c FROM match_hops mh
      JOIN matches m ON mh.match_id = m.id
      WHERE mh.carrier_id = ? AND m.status = 'confirmed'
      AND CAST(strftime('%H', mh.departure_time) AS INTEGER) >= 22
    `).get(carrier.id) as any)?.c || 0;
    if (nightCount >= 5) awardBadge(carrier.id, 'night-owl');
  }

  // neighborhood-hero: 20+ deliveries in the same city pair (for requester)
  const topRoute = db.prepare(`
    SELECT r.from_city, r.to_city, COUNT(*) as c FROM matches m
    JOIN requests r ON m.request_id = r.id
    WHERE r.requester_id = ? AND m.status = 'confirmed'
    GROUP BY r.from_city, r.to_city ORDER BY c DESC LIMIT 1
  `).get(request.requester_id) as any;
  if (topRoute && topRoute.c >= 20) awardBadge(request.requester_id, 'neighborhood-hero');

  // on-time-king: 95%+ on-time rate (carriers with 10+ trips)
  for (const hop of hops) {
    const carrier = db.prepare(`SELECT * FROM users WHERE id = ?`).get(hop.carrier_id) as any;
    if (carrier && carrier.total_trips >= 10 && carrier.reputation >= 4.8) {
      awardBadge(carrier.id, 'on-time-king');
    }
  }

  // first-delivery bonus XP for requester
  if (requester && requester.total_deliveries === 1) {
    db.prepare(`UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?`).run(XP_REWARDS.first_delivery, request.requester_id);
  }

  // ten-deliveries milestone
  if (requester && requester.total_deliveries === 10) {
    db.prepare(`UPDATE users SET xp = COALESCE(xp, 0) + ? WHERE id = ?`).run(XP_REWARDS.ten_deliveries, request.requester_id);
  }

  // Notify carrier(s) about payment release (non-fatal)
  try {
    for (const hop of hops) {
      const carrier = db.prepare(`SELECT telegram_id FROM users WHERE id = ?`).get(hop.carrier_id) as any;
      if (carrier?.telegram_id) {
        notifyUser(carrier.telegram_id, `💰 Payment released! +${hop.fee_ton} TON. Thanks for carrying!`);
      }
    }
  } catch (e) {
    console.error('Notification error (non-fatal):', e);
  }

  const updatedMatch = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId);

  return res.json({
    match: updatedMatch,
    hops,
    xp_awarded: { carrier: carrierXpTotal, requester: requesterXp },
    new_badges,
  });
});

// GET /matches/by-request/:requestId — find match for a given request
router.get('/by-request/:requestId', async (req: Request, res: Response) => {
  const requestId = parseInt(req.params.requestId as string);

  const match = db.prepare(`SELECT * FROM matches WHERE request_id = ? ORDER BY id DESC LIMIT 1`).get(requestId) as any;
  if (!match) return res.status(404).json({ error: 'No match for this request' });

  const hops = db.prepare(`
    SELECT mh.*, u.display_name as carrier_name, u.reputation as carrier_reputation
    FROM match_hops mh
    JOIN users u ON mh.carrier_id = u.id
    WHERE mh.match_id = ?
    ORDER BY mh.hop_order
  `).all(match.id);

  const price = await convertTonToFiat(match.total_fee_ton, 'CHF');

  return res.json({ match, hops, price });
});

// GET /matches/:id — return match with hops, carrier info, fiat prices
router.get('/:id', async (req: Request, res: Response) => {
  const matchId = parseInt(req.params.id as string);

  const match = db.prepare(`SELECT * FROM matches WHERE id = ?`).get(matchId) as any;
  if (!match) return res.status(404).json({ error: 'Match not found' });

  const hops = db.prepare(`
    SELECT mh.*, u.display_name as carrier_name, u.reputation as carrier_reputation
    FROM match_hops mh
    JOIN users u ON mh.carrier_id = u.id
    WHERE mh.match_id = ?
    ORDER BY mh.hop_order
  `).all(matchId);

  const price = await convertTonToFiat(match.total_fee_ton, 'CHF');

  return res.json({ match, hops, price });
});

export default router;
