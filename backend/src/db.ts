import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '..', 'carryton.db'));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run schema migration
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    username TEXT,
    display_name TEXT,
    wallet_address TEXT,
    avatar_id TEXT,
    reputation REAL DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    carrier_id INTEGER NOT NULL REFERENCES users(id),
    from_city TEXT NOT NULL,
    to_city TEXT NOT NULL,
    departure_time DATETIME NOT NULL,
    max_size TEXT DEFAULT 'small' CHECK(max_size IN ('small','medium','large')),
    max_weight_kg REAL DEFAULT 5.0,
    price_ton REAL,
    accepts_passengers INTEGER DEFAULT 0,
    available_seats INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','matched','completed','cancelled')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT DEFAULT 'package' CHECK(type IN ('package','passenger')),
    from_city TEXT NOT NULL,
    to_city TEXT NOT NULL,
    deadline DATETIME,
    package_size TEXT DEFAULT 'small' CHECK(package_size IN ('small','medium','large')),
    package_desc TEXT,
    budget_ton REAL,
    is_errand INTEGER DEFAULT 0,
    errand_details TEXT,
    passenger_count INTEGER DEFAULT 0,
    urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('normal','urgent')),
    status TEXT DEFAULT 'open' CHECK(status IN ('open','matched','in_transit','delivered','confirmed','cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES requests(id),
    status TEXT DEFAULT 'proposed' CHECK(status IN ('proposed','accepted','in_transit','delivered','confirmed','disputed')),
    total_fee_ton REAL NOT NULL,
    protocol_fee_ton REAL NOT NULL,
    carrier_payout_ton REAL NOT NULL,
    escrow_address TEXT,
    ai_reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS match_hops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    hop_order INTEGER NOT NULL,
    trip_id INTEGER NOT NULL REFERENCES trips(id),
    carrier_id INTEGER NOT NULL REFERENCES users(id),
    from_city TEXT NOT NULL,
    to_city TEXT NOT NULL,
    departure_time DATETIME,
    fee_ton REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','picked_up','delivered','confirmed')),
    UNIQUE(match_id, hop_order)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    reviewer_id INTEGER NOT NULL REFERENCES users(id),
    reviewee_id INTEGER NOT NULL REFERENCES users(id),
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    tags TEXT,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_badges (
    user_id INTEGER NOT NULL REFERENCES users(id),
    badge_id TEXT NOT NULL,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, badge_id)
  );

  CREATE TABLE IF NOT EXISTS tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    tipper_id INTEGER NOT NULL REFERENCES users(id),
    carrier_id INTEGER NOT NULL REFERENCES users(id),
    amount_ton REAL NOT NULL,
    ai_suggested INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tips_carrier ON tips(carrier_id);
  CREATE INDEX IF NOT EXISTS idx_tips_tipper ON tips(tipper_id);
  CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
  CREATE INDEX IF NOT EXISTS idx_trips_departure ON trips(departure_time);
  CREATE INDEX IF NOT EXISTS idx_trips_cities ON trips(from_city, to_city);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
  CREATE INDEX IF NOT EXISTS idx_matches_request ON matches(request_id);
`);

export default db;
