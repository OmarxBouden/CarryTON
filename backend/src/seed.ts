import db from './db';

// Compute tomorrow's date for trip departure times
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setSeconds(0, 0);

function tomorrowAt(hours: number, minutes: number): string {
  const d = new Date(tomorrow);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const now = new Date().toISOString();

// Delete all existing data in reverse FK order
db.exec(`
  DELETE FROM tips;
  DELETE FROM user_badges;
  DELETE FROM reviews;
  DELETE FROM match_hops;
  DELETE FROM matches;
  DELETE FROM requests;
  DELETE FROM trips;
  DELETE FROM users;
`);

// Reset autoincrement counters
db.exec(`
  DELETE FROM sqlite_sequence;
`);

// Insert demo users
const insertUser = db.prepare(`
  INSERT INTO users (id, telegram_id, username, display_name, wallet_address, avatar_id, reputation, total_trips, total_deliveries, xp, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const users = [
  //                                                       avatar    rep  trips del  xp
  [1, 'tg_alice',  'alice_carries', 'Alice M.',  null, 'fox',     4.8, 12, 0, 280, now],
  [2, 'tg_bob',    'bob_sends',     'Bob W.',    null, null,      4.5, 3,  8, 120, now],  // Bob picks on first visit
  [3, 'tg_marco',  'marco_rides',   'Marco R.',  null, 'falcon',  4.6, 7,  2, 190, now],
  [4, 'tg_sophie', 'sophie_swift',  'Sophie K.', null, 'turtle',  5.0, 5,  5, 350, now],
  [5, 'tg_jonas',  'jonas_trek',    'Jonas T.',  null, 'goat',    4.3, 9,  1, 160, now],
];

for (const u of users) {
  insertUser.run(...u);
}

// Insert demo trips
// accepts_passengers: 0=no, 1=yes | available_seats: 0-4
const insertTrip = db.prepare(`
  INSERT INTO trips (id, carrier_id, from_city, to_city, departure_time, max_size, max_weight_kg, price_ton, accepts_passengers, available_seats, status, notes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const trips = [
  //                                                                    size     kg   price  pass seats
  [1, 1, 'Lausanne', 'Geneva',    tomorrowAt(9, 0),   'small',  5.0,  null,    0,   0,   'active', 'Can pick up along A1'],
  [2, 3, 'Geneva',   'Lyon',      tomorrowAt(11, 30),  'medium', 10.0, 8.0,    1,   3,   'active', 'Driving, trunk space + 3 seats'],
  [3, 4, 'Zurich',   'Bern',      tomorrowAt(14, 0),   'large',  20.0, 5.0,    0,   0,   'active', 'Moving van, lots of space'],
  [4, 5, 'Bern',     'Lausanne',  tomorrowAt(16, 45),  'small',  5.0,  4.0,    1,   2,   'active', '2 seats available'],
  [5, 1, 'Lausanne', 'Bern',      tomorrowAt(13, 0),   'medium', 8.0,  null,   0,   0,   'active', 'Second trip of the day'],
  [6, 3, 'Lyon',     'Paris',     tomorrowAt(15, 0),   'small',  5.0,  15.0,   1,   1,   'active', 'TGV, 1 seat + small items'],
  [7, 4, 'Geneva',   'Lausanne',  tomorrowAt(18, 0),   'large',  15.0, 3.0,    1,   4,   'active', 'Return trip, 4 seats free'],
  [8, 5, 'Lausanne', 'Geneva',    tomorrowAt(10, 30),  'small',  3.0,  3.5,    0,   0,   'active', 'Quick morning run'],
];

for (const t of trips) {
  insertTrip.run(...t);
}

// Insert demo badges
const insertBadge = db.prepare(`
  INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)
`);

const badges = [
  // Alice
  [1, 'lightning-fast', now],
  [1, 'on-time-king', now],
  [1, 'trusted-carrier', now],
  // Bob (demo user — starts with zero badges, earns them through actions)
  // Marco
  [3, 'relay-master', now],
  [3, 'pack-mule', now],
  // Sophie
  [4, 'five-star-streak', now],
  [4, 'first-carry', now],
  // Jonas
  [5, 'scenic-route', now],
  [5, 'night-owl', now],
];

for (const b of badges) {
  insertBadge.run(...b);
}

// ---- Completed match: Alice requested Zurich→Bern, matched to Sophie's trip (trip 3) ----
const insertRequest = db.prepare(`
  INSERT INTO requests (id, requester_id, from_city, to_city, deadline, package_size, package_desc, budget_ton, urgency, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertRequest.run(1, 1, 'Zurich', 'Bern', tomorrowAt(20, 0), 'small', 'Documents envelope', 5.0, 'normal', 'confirmed', now);

const insertMatch = db.prepare(`
  INSERT INTO matches (id, request_id, status, total_fee_ton, protocol_fee_ton, carrier_payout_ton, ai_reasoning, escrow_address)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
insertMatch.run(1, 1, 'confirmed', 5.0, 0.25, 4.75, 'Direct route: Sophie travels Zurich→Bern daily.', 'mock_escrow_completed_1');

const insertHop = db.prepare(`
  INSERT INTO match_hops (match_id, hop_order, trip_id, carrier_id, from_city, to_city, departure_time, fee_ton, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertHop.run(1, 1, 3, 4, 'Zurich', 'Bern', tomorrowAt(14, 0), 5.0, 'confirmed');

// Review: Alice gave Sophie 5 stars
const insertReview = db.prepare(`
  INSERT INTO reviews (match_id, reviewer_id, reviewee_id, rating, tags, comment)
  VALUES (?, ?, ?, ?, ?, ?)
`);
insertReview.run(1, 1, 4, 5, JSON.stringify(['fast', 'friendly']), 'Super quick delivery, very kind!');

// ---- In-transit match: Bob requested Lausanne→Lyon ----
insertRequest.run(2, 2, 'Lausanne', 'Lyon', tomorrowAt(22, 0), 'medium', 'Gift box for a friend', 8.5, 'normal', 'in_transit', now);

insertMatch.run(2, 2, 'in_transit', 8.5, 0.43, 8.07, 'Multi-hop relay: Alice hands off to Marco in Geneva.', 'mock_escrow_intransit_2');

// Hop 1: Alice Lausanne→Geneva (delivered)
insertHop.run(2, 1, 1, 1, 'Lausanne', 'Geneva', tomorrowAt(9, 0), 4.0, 'delivered');
// Hop 2: Marco Geneva→Lyon (picked up)
insertHop.run(2, 2, 2, 3, 'Geneva', 'Lyon', tomorrowAt(11, 30), 4.5, 'picked_up');

console.log(`Seeded ${users.length} users, ${trips.length} trips, ${badges.length} badges, 2 requests, 2 matches, 3 hops, 1 review`);
