import { Router, Request, Response } from 'express';
import db from '../db';
import { XP_REWARDS } from '../../../shared/types';

const router = Router();

// POST /reviews — submit a review
router.post('/', (req: Request, res: Response) => {
  const { match_id, reviewer_id, reviewee_id, rating, tags, comment } = req.body;

  if (!match_id || !reviewer_id || !reviewee_id || rating === undefined) {
    return res.status(400).json({ error: 'match_id, reviewer_id, reviewee_id, rating are required' });
  }

  const result = db.prepare(`
    INSERT INTO reviews (match_id, reviewer_id, reviewee_id, rating, tags, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(match_id, reviewer_id, reviewee_id, rating, tags ? JSON.stringify(tags) : null, comment ?? null);

  const rawReview = db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(result.lastInsertRowid) as any;
  const review = { ...rawReview, tags: rawReview.tags ? JSON.parse(rawReview.tags) : [] };

  // Recalculate reviewee's reputation
  const avgResult = db.prepare(`
    SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewee_id = ?
  `).get(reviewee_id) as any;
  const newReputation = Math.round(avgResult.avg_rating * 10) / 10;

  // Award XP if 5-star
  let xpGain = 0;
  if (rating === 5) {
    xpGain = XP_REWARDS.five_star_review_received;
  }

  db.prepare(`
    UPDATE users SET reputation = ?, xp = xp + ? WHERE id = ?
  `).run(newReputation, xpGain, reviewee_id);

  // Check badge eligibility
  const new_badges: string[] = [];

  if (rating === 5) {
    // Check for 10 consecutive 5-star reviews
    const recentReviews = db.prepare(`
      SELECT rating FROM reviews WHERE reviewee_id = ? ORDER BY created_at DESC LIMIT 10
    `).all(reviewee_id) as any[];

    if (recentReviews.length >= 10 && recentReviews.every((r: any) => r.rating === 5)) {
      const alreadyHas = db.prepare(`
        SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = 'five-star-streak'
      `).get(reviewee_id);
      if (!alreadyHas) {
        db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`).run(reviewee_id, 'five-star-streak');
        new_badges.push('five-star-streak');
      }
    }
  }

  // lightning-fast: 5+ completed deliveries
  const user = db.prepare(`SELECT total_trips, reputation FROM users WHERE id = ?`).get(reviewee_id) as any;
  if (user && user.total_trips >= 5) {
    const has = db.prepare(`SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = 'lightning-fast'`).get(reviewee_id);
    if (!has) {
      db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`).run(reviewee_id, 'lightning-fast');
      new_badges.push('lightning-fast');
    }
  }

  // scenic-route: 5+ deliveries with average rating below 4 (delivers... eventually)
  if (user && user.total_trips >= 5 && user.reputation < 4.0) {
    const has = db.prepare(`SELECT 1 FROM user_badges WHERE user_id = ? AND badge_id = 'scenic-route'`).get(reviewee_id);
    if (!has) {
      db.prepare(`INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)`).run(reviewee_id, 'scenic-route');
      new_badges.push('scenic-route');
    }
  }

  return res.status(201).json({ review, new_badges });
});

// GET /reviews/:user_id — all reviews for a user
router.get('/:user_id', (req: Request, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, u.display_name as reviewer_name
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.reviewee_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.user_id) as any[];

  // Parse JSON tags back to arrays
  const parsed = reviews.map((r) => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : [],
  }));

  return res.json({ reviews: parsed });
});

export default router;
