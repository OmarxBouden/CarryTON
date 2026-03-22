import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

function fixTripBooleans(row: any) {
  if (!row) return row;
  return { ...row, accepts_passengers: !!row.accepts_passengers };
}
function fixTripList(rows: any[]) { return rows.map(fixTripBooleans); }

// GET /trips — list trips with filters
router.get('/', (req: Request, res: Response) => {
  const { status = 'active', from_city, to_city, date } = req.query;

  let query = `
    SELECT t.*, u.display_name as carrier_name, u.reputation as carrier_reputation, u.avatar_id as carrier_avatar
    FROM trips t
    JOIN users u ON t.carrier_id = u.id
    WHERE t.status = ?
  `;
  const params: any[] = [status];

  if (from_city) {
    query += ` AND LOWER(t.from_city) LIKE LOWER(?)`;
    params.push(`%${from_city}%`);
  }
  if (to_city) {
    query += ` AND LOWER(t.to_city) LIKE LOWER(?)`;
    params.push(`%${to_city}%`);
  }
  if (date) {
    query += ` AND DATE(t.departure_time) = DATE(?)`;
    params.push(date);
  }

  query += ` ORDER BY t.departure_time ASC`;

  const trips = db.prepare(query).all(...params) as any[];
  return res.json({ trips: fixTripList(trips) });
});

// GET /trips/:id — single trip with carrier info
router.get('/:id', (req: Request, res: Response) => {
  const trip = db.prepare(`
    SELECT t.*, u.display_name as carrier_name, u.reputation as carrier_reputation, u.avatar_id as carrier_avatar
    FROM trips t
    JOIN users u ON t.carrier_id = u.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  return res.json({ trip: fixTripBooleans(trip) });
});

// POST /trips — create trip
router.post('/', (req: Request, res: Response) => {
  const { carrier_id, from_city, to_city, departure_time, max_size, max_weight_kg, price_ton, accepts_passengers, available_seats, notes } = req.body;

  if (!carrier_id || !from_city || !to_city || !departure_time || !max_size) {
    return res.status(400).json({ error: 'carrier_id, from_city, to_city, departure_time, max_size are required' });
  }

  const result = db.prepare(`
    INSERT INTO trips (carrier_id, from_city, to_city, departure_time, max_size, max_weight_kg, price_ton, accepts_passengers, available_seats, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(carrier_id, from_city, to_city, departure_time, max_size, max_weight_kg ?? 5.0, price_ton ?? null, accepts_passengers ? 1 : 0, available_seats ?? 0, notes ?? null);

  const trip = db.prepare(`
    SELECT t.*, u.display_name as carrier_name, u.reputation as carrier_reputation, u.avatar_id as carrier_avatar
    FROM trips t JOIN users u ON t.carrier_id = u.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  return res.status(201).json({ trip });
});

// PATCH /trips/:id — update status
router.patch('/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  const { id } = req.params;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(id);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  db.prepare(`UPDATE trips SET status = ? WHERE id = ?`).run(status, id);

  const updated = db.prepare(`
    SELECT t.*, u.display_name as carrier_name, u.reputation as carrier_reputation, u.avatar_id as carrier_avatar
    FROM trips t JOIN users u ON t.carrier_id = u.id
    WHERE t.id = ?
  `).get(id);

  return res.json({ trip: updated });
});

export default router;
