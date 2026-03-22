import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

// SQLite stores booleans as 0/1 — convert to real booleans for API consumers
function fixBooleans(row: any) {
  if (!row) return row;
  return { ...row, is_errand: !!row.is_errand };
}
function fixBooleanList(rows: any[]) {
  return rows.map(fixBooleans);
}

// GET /requests — list requests with filters
router.get('/', (req: Request, res: Response) => {
  const { status = 'open', from_city, to_city } = req.query;

  let query = `
    SELECT r.*, u.display_name as requester_name
    FROM requests r
    JOIN users u ON r.requester_id = u.id
    WHERE r.status = ?
  `;
  const params: any[] = [status];

  if (from_city) {
    query += ` AND LOWER(r.from_city) LIKE LOWER(?)`;
    params.push(`%${from_city}%`);
  }
  if (to_city) {
    query += ` AND LOWER(r.to_city) LIKE LOWER(?)`;
    params.push(`%${to_city}%`);
  }

  query += ` ORDER BY r.created_at DESC`;

  const requests = db.prepare(query).all(...params) as any[];
  return res.json({ requests: fixBooleanList(requests) });
});

// GET /requests/:id — single request with requester info
router.get('/:id', (req: Request, res: Response) => {
  const request = db.prepare(`
    SELECT r.*, u.display_name as requester_name
    FROM requests r
    JOIN users u ON r.requester_id = u.id
    WHERE r.id = ?
  `).get(req.params.id);

  if (!request) return res.status(404).json({ error: 'Request not found' });
  return res.json({ request: fixBooleans(request) });
});

// POST /requests — create delivery request
router.post('/', (req: Request, res: Response) => {
  const {
    requester_id, from_city, to_city, deadline,
    type, package_size, package_desc, budget_ton,
    is_errand, errand_details, passenger_count, urgency
  } = req.body;

  if (!requester_id || !from_city || !to_city) {
    return res.status(400).json({ error: 'requester_id, from_city, to_city are required' });
  }

  const reqType = type === 'passenger' ? 'passenger' : 'package';

  const result = db.prepare(`
    INSERT INTO requests (requester_id, type, from_city, to_city, deadline, package_size, package_desc, budget_ton, is_errand, errand_details, passenger_count, urgency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requester_id, reqType, from_city, to_city,
    deadline ?? null, package_size ?? 'small', package_desc ?? null,
    budget_ton ?? null, is_errand ? 1 : 0, errand_details ?? null,
    passenger_count ?? (reqType === 'passenger' ? 1 : 0),
    urgency ?? 'normal'
  );

  const request = db.prepare(`
    SELECT r.*, u.display_name as requester_name
    FROM requests r JOIN users u ON r.requester_id = u.id
    WHERE r.id = ?
  `).get(result.lastInsertRowid);

  return res.status(201).json({ request: fixBooleans(request) });
});

// PATCH /requests/:id — update status
router.patch('/:id', (req: Request, res: Response) => {
  const { status } = req.body;
  const { id } = req.params;

  const request = db.prepare(`SELECT * FROM requests WHERE id = ?`).get(id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  db.prepare(`UPDATE requests SET status = ? WHERE id = ?`).run(status, id);

  const updated = db.prepare(`
    SELECT r.*, u.display_name as requester_name
    FROM requests r JOIN users u ON r.requester_id = u.id
    WHERE r.id = ?
  `).get(id);

  return res.json({ request: fixBooleans(updated) });
});

export default router;
