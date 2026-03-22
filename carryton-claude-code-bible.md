# CarryTON — Claude Code Bible

## Strategy Overview

### Model Selection Rules
- **Opus**: Use for Prompts 0, 4, 7, 9, 11, 13 (architecture decisions, AI matching logic, complex React screens, smart contract, final integration). These require deep reasoning about system design, multi-file coordination, and nuanced AI prompt engineering.
- **Sonnet**: Use for Prompts 1, 2, 3, 5, 6, 8, 10, 12, 14 (CRUD routes, simple screens, database operations, bot setup, styling). These are execution-heavy with clear specs — Sonnet is faster and cheaper here.

### Execution Rules for Claude Code
1. Never skip files. If the prompt says "create X", create it.
2. Always run the project after each prompt to verify it compiles/starts.
3. If a dependency install fails, try an alternative and note it.
4. Do NOT refactor previous prompts' code unless the current prompt explicitly says to.
5. Every file must have the exact path specified. Do not reorganize the folder structure.
6. After each prompt, commit to git with a descriptive message.

### Project Monorepo Structure (created in Prompt 0)
```
carryton/
├── frontend/          # Next.js 14 (App Router) — Telegram Mini App
├── backend/           # Node.js + Express + SQLite
├── contract/          # Tact smart contract
├── bot/               # Telegram Bot (grammy) — separate process
├── shared/            # Shared TypeScript types
└── README.md
```

---

## PROMPT 0 — Project Scaffolding + Shared Types
**Model: Opus | Est. time: 10 min | Person B starts here**

```
You are building "CarryTON" — a community delivery network as a Telegram Mini App on TON blockchain for a hackathon. I will give you prompts one at a time. Follow them EXACTLY. Do not anticipate future prompts or build things not asked for.

TASK: Initialize the monorepo structure and shared types. Do NOT install any packages yet beyond the bare minimum for each sub-project to start.

1. Create the top-level folder structure:
   carryton/
   ├── frontend/
   ├── backend/
   ├── contract/
   ├── bot/
   ├── shared/
   └── README.md

2. Initialize frontend:
   cd frontend && npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
   Then delete all boilerplate content from src/app/page.tsx and src/app/layout.tsx (keep the shell, remove the default Next.js content).
   Set up the layout.tsx to include:
   - Viewport meta for Telegram Mini App (width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no)
   - Color scheme support (dark/light based on Telegram theme)
   - Import of global CSS only

3. Initialize backend:
   cd backend && npm init -y && npm install express better-sqlite3 cors dotenv uuid
   npm install -D typescript @types/express @types/better-sqlite3 @types/cors ts-node nodemon
   Create tsconfig.json with:
   { "compilerOptions": { "target": "ES2020", "module": "commonjs", "outDir": "./dist", "rootDir": "./src", "strict": true, "esModuleInterop": true, "resolveJsonModule": true }, "include": ["src/**/*"] }
   Create src/index.ts with a basic Express server on port 3001 that:
   - Uses cors({ origin: '*' })
   - Has a GET /health route returning { status: 'ok' }
   - Imports dotenv/config
   Create .env with:
   PORT=3001
   ANTHROPIC_API_KEY=placeholder
   TELEGRAM_BOT_TOKEN=placeholder
   COINGECKO_API_URL=https://api.coingecko.com/api/v3
   PROTOCOL_WALLET=placeholder
   PROTOCOL_FEE_BPS=500
   Create nodemon.json: { "watch": ["src"], "ext": "ts", "exec": "ts-node src/index.ts" }
   Add to package.json scripts: "dev": "nodemon", "build": "tsc", "start": "node dist/index.js", "seed": "ts-node src/seed.ts"

4. Initialize bot:
   cd bot && npm init -y && npm install grammy dotenv
   npm install -D typescript ts-node @types/node
   Create tsconfig.json (same as backend).
   Create src/index.ts with placeholder: console.log('Bot starting...')
   Create .env with: TELEGRAM_BOT_TOKEN=placeholder, MINI_APP_URL=placeholder, BACKEND_URL=http://localhost:3001

5. Create shared/types.ts with ALL the TypeScript types the project will use:

```typescript
// ===== DATABASE ENTITY TYPES =====

export interface User {
  id: number;
  telegram_id: string;
  username: string | null;
  display_name: string | null;
  wallet_address: string | null;
  reputation: number;        // 1.0 - 5.0
  total_trips: number;
  total_deliveries: number;
  xp: number;                // experience points for avatar evolution
  created_at: string;
}

export interface Trip {
  id: number;
  carrier_id: number;
  carrier_name?: string;     // joined from users
  carrier_reputation?: number;
  from_city: string;
  to_city: string;
  departure_time: string;    // ISO 8601
  max_size: 'small' | 'medium' | 'large';
  max_weight_kg: number;
  price_ton: number | null;  // null = open to AI pricing
  status: 'active' | 'matched' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
}

export interface DeliveryRequest {
  id: number;
  requester_id: number;
  requester_name?: string;
  from_city: string;
  to_city: string;
  deadline: string | null;
  package_size: 'small' | 'medium' | 'large';
  package_desc: string | null;
  budget_ton: number | null;
  is_errand: boolean;
  errand_details: string | null;
  urgency: 'normal' | 'urgent';
  status: 'open' | 'matched' | 'in_transit' | 'delivered' | 'confirmed' | 'cancelled';
  created_at: string;
}

export interface Match {
  id: number;
  request_id: number;
  status: 'proposed' | 'accepted' | 'in_transit' | 'delivered' | 'confirmed' | 'disputed';
  total_fee_ton: number;
  protocol_fee_ton: number;
  carrier_payout_ton: number;
  escrow_address: string | null;
  ai_reasoning: string;       // Claude's explanation of why this route
  created_at: string;
}

export interface MatchHop {
  id: number;
  match_id: number;
  hop_order: number;
  trip_id: number;
  carrier_id: number;
  carrier_name?: string;
  from_city: string;
  to_city: string;
  departure_time: string;
  fee_ton: number;
  status: 'pending' | 'picked_up' | 'delivered' | 'confirmed';
}

export interface Badge {
  id: string;               // e.g. 'lightning-fast'
  name: string;             // e.g. 'Lightning fast'
  emoji: string;            // e.g. '⚡'
  description: string;
  tier: 'bronze' | 'silver' | 'gold';
  category: 'speed' | 'reliability' | 'volume' | 'rating' | 'special';
}

export interface UserBadge {
  user_id: number;
  badge_id: string;
  earned_at: string;
}

// ===== AVATAR SYSTEM =====

export interface AvatarState {
  level: number;            // 1-5 based on XP
  base: string;             // 'explorer' | 'courier' | 'pilot'
  accessories: string[];    // earned accessories: 'backpack', 'hat', 'scooter', 'jetpack', 'crown'
  flair: string | null;     // visual effect: 'sparkle', 'flame', 'ice', 'rainbow'
}

export const AVATAR_LEVELS = [
  { level: 1, xp_min: 0,    name: 'Newcomer',    accessory: null },
  { level: 2, xp_min: 50,   name: 'Backpacker',  accessory: 'backpack' },
  { level: 3, xp_min: 150,  name: 'Adventurer',  accessory: 'hat' },
  { level: 4, xp_min: 400,  name: 'Road warrior', accessory: 'scooter' },
  { level: 5, xp_min: 1000, name: 'Jet setter',  accessory: 'jetpack' },
] as const;

export const XP_REWARDS = {
  complete_trip_as_carrier: 20,
  complete_delivery_as_requester: 10,
  five_star_review_received: 15,
  multi_hop_relay_completed: 30,
  first_delivery: 50,       // one-time bonus
  ten_deliveries: 100,      // milestone bonus
} as const;

// ===== BADGE DEFINITIONS =====

export const BADGES: Badge[] = [
  { id: 'lightning-fast', name: 'Lightning fast', emoji: '⚡', description: 'Delivered 5+ packages ahead of schedule', tier: 'gold', category: 'speed' },
  { id: 'on-time-king', name: 'On-time royalty', emoji: '👑', description: '95%+ on-time delivery rate', tier: 'gold', category: 'reliability' },
  { id: 'relay-master', name: 'Relay master', emoji: '🔗', description: 'Completed 3+ multi-hop relays', tier: 'silver', category: 'special' },
  { id: 'pack-mule', name: 'Pack mule', emoji: '🫏', description: 'Carried 10+ large packages', tier: 'silver', category: 'volume' },
  { id: 'five-star-streak', name: 'Five-star streak', emoji: '⭐', description: '10 consecutive 5-star reviews', tier: 'gold', category: 'rating' },
  { id: 'first-carry', name: 'First carry', emoji: '📦', description: 'Completed first delivery as carrier', tier: 'bronze', category: 'special' },
  { id: 'neighborhood-hero', name: 'Neighborhood hero', emoji: '🏘️', description: '20+ deliveries in the same city pair', tier: 'gold', category: 'volume' },
  { id: 'night-owl', name: 'Night owl', emoji: '🦉', description: '5+ deliveries completed after 10pm', tier: 'bronze', category: 'special' },
  { id: 'scenic-route', name: 'Scenic route specialist', emoji: '🏔️', description: 'Consistently delivers — just... eventually', tier: 'bronze', category: 'speed' },
  { id: 'trusted-carrier', name: 'Trusted carrier', emoji: '🛡️', description: '50+ completed deliveries with 4.5+ rating', tier: 'gold', category: 'reliability' },
];

// ===== AI MATCHING TYPES =====

export interface AIMatchResult {
  matches: AIRouteOption[];
  no_match_reason: string | null;
}

export interface AIRouteOption {
  hops: AIHop[];
  total_fee_ton: number;
  estimated_duration_hours: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  bundle_discount_applied: boolean;  // true if bundled with another request
  negotiation_note: string | null;   // e.g. "Carrier asked 5 TON but this is a short detour — suggested 3.5"
}

export interface AIHop {
  trip_id: number;
  carrier_id: number;
  carrier_name: string;
  from: string;
  to: string;
  departure_time: string;
  fee_ton: number;
}

// ===== PRICE DISPLAY =====

export interface PriceDisplay {
  ton: number;
  fiat_amount: number;
  fiat_currency: string;     // 'CHF', 'EUR', 'USD', etc.
  fiat_symbol: string;       // 'CHF', '€', '$'
  display: string;           // "3.5 TON (~CHF 10.50)"
}

// ===== API REQUEST/RESPONSE TYPES =====

export interface CreateTripRequest {
  from_city: string;
  to_city: string;
  departure_time: string;
  max_size: 'small' | 'medium' | 'large';
  max_weight_kg?: number;
  price_ton?: number | null;  // null = let AI decide
  notes?: string;
}

export interface CreateDeliveryRequest {
  from_city: string;
  to_city: string;
  deadline?: string;
  package_size: 'small' | 'medium' | 'large';
  package_desc?: string;
  budget_ton?: number;
  is_errand?: boolean;
  errand_details?: string;
  urgency?: 'normal' | 'urgent';
}

export interface MatchResponse {
  matches: (AIRouteOption & { match_id: number })[];
  prices: PriceDisplay[];     // parallel array with fiat conversions
  ton_price_usd: number;      // current TON/USD for reference
}

export interface ReviewRequest {
  match_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;             // 1-5
  tags: string[];             // ['fast', 'friendly', 'careful']
  comment?: string;
}
```

6. Initialize git:
   cd carryton && git init && create .gitignore with: node_modules, dist, .env, .next, *.db
   Then: git add -A && git commit -m "chore: scaffold monorepo with shared types"

7. Verify: run `cd backend && npm run dev` and confirm the health endpoint responds. Run `cd frontend && npm run dev` and confirm it starts on port 3000.

Do NOT create any other files. Do NOT install any other packages. Just the scaffold.
```

---

## PROMPT 1 — Database Schema + Seed Data
**Model: Sonnet | Est. time: 8 min | Person B**

```
Continue building CarryTON. You are now setting up the database.

TASK: Create the SQLite database schema and a seed script with realistic demo data.

1. Create backend/src/db.ts:
   - Import better-sqlite3
   - Create/open carryton.db in the backend root
   - Run the following schema as a migration on startup (use db.exec with IF NOT EXISTS):

TABLES:
- users: id INTEGER PRIMARY KEY AUTOINCREMENT, telegram_id TEXT UNIQUE NOT NULL, username TEXT, display_name TEXT, wallet_address TEXT, reputation REAL DEFAULT 5.0, total_trips INTEGER DEFAULT 0, total_deliveries INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP

- trips: id INTEGER PRIMARY KEY AUTOINCREMENT, carrier_id INTEGER NOT NULL REFERENCES users(id), from_city TEXT NOT NULL, to_city TEXT NOT NULL, departure_time DATETIME NOT NULL, max_size TEXT DEFAULT 'small' CHECK(max_size IN ('small','medium','large')), max_weight_kg REAL DEFAULT 5.0, price_ton REAL, status TEXT DEFAULT 'active' CHECK(status IN ('active','matched','completed','cancelled')), notes TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP

- requests: id INTEGER PRIMARY KEY AUTOINCREMENT, requester_id INTEGER NOT NULL REFERENCES users(id), from_city TEXT NOT NULL, to_city TEXT NOT NULL, deadline DATETIME, package_size TEXT DEFAULT 'small' CHECK(package_size IN ('small','medium','large')), package_desc TEXT, budget_ton REAL, is_errand INTEGER DEFAULT 0, errand_details TEXT, urgency TEXT DEFAULT 'normal' CHECK(urgency IN ('normal','urgent')), status TEXT DEFAULT 'open' CHECK(status IN ('open','matched','in_transit','delivered','confirmed','cancelled')), created_at DATETIME DEFAULT CURRENT_TIMESTAMP

- matches: id INTEGER PRIMARY KEY AUTOINCREMENT, request_id INTEGER NOT NULL REFERENCES requests(id), status TEXT DEFAULT 'proposed' CHECK(status IN ('proposed','accepted','in_transit','delivered','confirmed','disputed')), total_fee_ton REAL NOT NULL, protocol_fee_ton REAL NOT NULL, carrier_payout_ton REAL NOT NULL, escrow_address TEXT, ai_reasoning TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP

- match_hops: id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER NOT NULL REFERENCES matches(id), hop_order INTEGER NOT NULL, trip_id INTEGER NOT NULL REFERENCES trips(id), carrier_id INTEGER NOT NULL REFERENCES users(id), from_city TEXT NOT NULL, to_city TEXT NOT NULL, departure_time DATETIME, fee_ton REAL NOT NULL, status TEXT DEFAULT 'pending' CHECK(status IN ('pending','picked_up','delivered','confirmed')), UNIQUE(match_id, hop_order)

- reviews: id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER NOT NULL REFERENCES matches(id), reviewer_id INTEGER NOT NULL REFERENCES users(id), reviewee_id INTEGER NOT NULL REFERENCES users(id), rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5), tags TEXT, comment TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP

- user_badges: user_id INTEGER NOT NULL REFERENCES users(id), badge_id TEXT NOT NULL, earned_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, badge_id)

INDEXES:
- idx_trips_status ON trips(status)
- idx_trips_departure ON trips(departure_time)
- idx_trips_cities ON trips(from_city, to_city)
- idx_requests_status ON requests(status)
- idx_matches_request ON matches(request_id)

Export the db instance as default export.

2. Create backend/src/seed.ts:
   - Import db from ./db
   - Delete all existing data (DELETE FROM each table in reverse FK order)
   - Insert these EXACT demo users:
     (1, 'tg_alice',   'alice_carries', 'Alice M.',  null, 4.8, 12, 0, 280, now)
     (2, 'tg_bob',     'bob_sends',     'Bob W.',    null, 4.5, 3,  8, 120, now)
     (3, 'tg_marco',   'marco_rides',   'Marco R.',  null, 4.6, 7,  2, 190, now)
     (4, 'tg_sophie',  'sophie_swift',  'Sophie K.', null, 5.0, 5,  5, 350, now)
     (5, 'tg_jonas',   'jonas_trek',    'Jonas T.',  null, 4.3, 9,  1, 160, now)

   - Insert these EXACT demo trips (all status 'active', dates = tomorrow):
     (1, carrier=1, 'Lausanne', 'Geneva',     tomorrow 09:00, 'small', 5.0, null,  'active', 'Can pick up along A1')
     (2, carrier=3, 'Geneva',   'Lyon',        tomorrow 11:30, 'medium', 10.0, 8.0, 'active', 'Driving, trunk space available')
     (3, carrier=4, 'Zurich',   'Bern',        tomorrow 14:00, 'large', 20.0, 5.0, 'active', 'Moving van, lots of space')
     (4, carrier=5, 'Bern',     'Lausanne',    tomorrow 16:45, 'small', 5.0, 4.0,  'active', null)
     (5, carrier=1, 'Lausanne', 'Bern',        tomorrow 13:00, 'medium', 8.0, null, 'active', 'Second trip of the day')
     (6, carrier=3, 'Lyon',     'Paris',       tomorrow 15:00, 'small', 5.0, 15.0, 'active', 'TGV, small items only')
     (7, carrier=4, 'Geneva',   'Lausanne',    tomorrow 18:00, 'large', 15.0, 3.0, 'active', 'Return trip')
     (8, carrier=5, 'Lausanne', 'Geneva',      tomorrow 10:30, 'small', 3.0, 3.5,  'active', 'Quick morning run')

   - Insert these demo badges for users:
     Alice: 'lightning-fast', 'on-time-king', 'trusted-carrier'
     Sophie: 'five-star-streak', 'first-carry'
     Marco: 'relay-master', 'pack-mule'
     Jonas: 'scenic-route', 'night-owl'

   - console.log a summary: "Seeded X users, Y trips, Z badges"

3. In backend/src/index.ts, import './db' at the top so the schema runs on startup.

4. Verify: run `npm run seed` and confirm it completes. Then run `npm run dev` and confirm /health still works.

5. git add -A && git commit -m "feat: database schema + seed data"
```

---

## PROMPT 2 — Backend CRUD API Routes
**Model: Sonnet | Est. time: 12 min | Person B**

```
Continue building CarryTON backend.

TASK: Create all REST API routes for users, trips, requests, and reviews. Do NOT build the matching endpoint yet (that's a separate prompt).

1. Create backend/src/routes/users.ts:
   - Router with Express.Router()
   - GET /users/:telegram_id — return user by telegram_id, joined with their badges. Response: { user: User & { badges: UserBadge[] } }
   - POST /users — upsert user from Telegram init data. Body: { telegram_id, username?, display_name? }. If exists, update; if not, insert. Return the user.
   - PATCH /users/:id — update wallet_address, display_name. Return updated user.
   - GET /users/:id/avatar — return the computed AvatarState based on user.xp. Use the AVATAR_LEVELS thresholds from shared/types to determine level and accessories. Return: { avatar: AvatarState, next_level_xp: number, progress_percent: number }

2. Create backend/src/routes/trips.ts:
   - GET /trips — query params: status (default 'active'), from_city (optional, case-insensitive LIKE), to_city (optional), date (optional, filters to that day). Join with users table to include carrier_name and carrier_reputation. Return: { trips: Trip[] }
   - POST /trips — body: CreateTripRequest + carrier_id. Insert and return: { trip: Trip }
   - PATCH /trips/:id — body: { status }. Update and return: { trip: Trip }
   - GET /trips/:id — return single trip with carrier info

3. Create backend/src/routes/requests.ts:
   - GET /requests — query params: status (default 'open'), from_city (optional), to_city (optional). Join with users for requester_name. Return: { requests: DeliveryRequest[] }
   - POST /requests — body: CreateDeliveryRequest + requester_id. Insert and return: { request: DeliveryRequest }
   - PATCH /requests/:id — body: { status }. Update and return: { request: DeliveryRequest }
   - GET /requests/:id — return single request with requester info

4. Create backend/src/routes/reviews.ts:
   - POST /reviews — body: ReviewRequest. Insert review. Then:
     a) Recalculate reviewee's reputation as average of all their review ratings. Update users table.
     b) Award XP: add XP_REWARDS.five_star_review_received if rating === 5
     c) Check badge eligibility: if they now have 10 consecutive 5-star reviews → award 'five-star-streak'. If 5+ deliveries ahead of schedule → 'lightning-fast'. (Simple checks, not perfect — hackathon.)
     Return: { review: Review, new_badges: string[] }
   - GET /reviews/:user_id — return all reviews for a user, sorted newest first

5. Create backend/src/routes/price.ts:
   - GET /price/ton — fetches current TON price from CoinGecko API: GET https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd,eur,chf
   - Cache the result in memory for 5 minutes (simple: store result + timestamp, return cached if < 5 min old)
   - Response: { ton_usd: number, ton_eur: number, ton_chf: number, updated_at: string }
   - Also export a helper function: convertTonToFiat(ton_amount: number, currency: 'CHF'|'EUR'|'USD'): Promise<PriceDisplay> that uses the cached price to build a PriceDisplay object with format "X.XX TON (~CHF Y.YY)"

   IMPORTANT: For the hackathon, if CoinGecko is unreachable or rate-limited, hardcode fallback prices: TON = $2.80 USD, CHF 2.50, EUR 2.60. Log a warning but don't crash.

6. Mount all routers in backend/src/index.ts:
   app.use('/api/users', usersRouter);
   app.use('/api/trips', tripsRouter);
   app.use('/api/requests', requestsRouter);
   app.use('/api/reviews', reviewsRouter);
   app.use('/api/price', priceRouter);

7. Add error handling middleware at the end of index.ts:
   app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

8. Verify: run the seed, start the server, and test these curls:
   curl http://localhost:3001/api/trips
   curl http://localhost:3001/api/users/tg_alice
   curl http://localhost:3001/api/price/ton
   All should return JSON with data.

9. git commit -m "feat: CRUD API routes + price conversion"
```

---

## PROMPT 3 — AI Matching Engine (The Core Differentiator)
**Model: Opus | Est. time: 15 min | Person B**

```
Continue building CarryTON backend.

TASK: Build the AI-powered matching engine. This is the MOST IMPORTANT part of the project — the AI agent that finds routes, sets prices, negotiates, and bundles deliveries.

1. Install: cd backend && npm install @anthropic-ai/sdk

2. Create backend/src/services/matching.ts:

This file contains the Claude-powered matching engine. It does THREE things:
A) Find optimal routes (single-hop and multi-hop)
B) Set or negotiate prices (the AI is the pricing engine, not the user)
C) Bundle multiple requests on the same route for discounts

Here is the EXACT system prompt to use (store as a const):

SYSTEM PROMPT:
"""
You are CarryTON's intelligent delivery matching and pricing agent. You operate a community delivery network where everyday travelers carry packages for others.

YOUR THREE JOBS:

1. ROUTE MATCHING
   - Match delivery requests to available carrier trips
   - Find direct matches (A→B) or multi-hop relays (A→C + C→B)
   - For multi-hop: the arrival city of hop N must equal the departure city of hop N+1. Allow minimum 30-minute buffer between hops for handoff.
   - Fuzzy match city names: "Lausanne" = "lausanne" = "Lausanne, Switzerland". "Geneva" = "Genève" = "Geneve".
   - Size constraint: trip max_size must be >= package_size. Order: small < medium < large.

2. INTELLIGENT PRICING
   - You SET the price. You are the pricing engine.
   - Base pricing formula (use as a STARTING POINT, then adjust):
     * Short trip (<50km): 2-4 TON
     * Medium trip (50-200km): 4-10 TON
     * Long trip (>200km): 10-25 TON
   - ADJUSTMENTS you MUST consider:
     * If carrier already set a price → respect it, but you can suggest a lower price to the requester if the package is tiny/effortless
     * If carrier has no price → you set one based on distance + demand
     * Urgency = 'urgent' → multiply by 1.5x
     * Package size 'large' → add 20-40% premium
     * If the package is on the carrier's EXACT route with zero detour → discount 15-25% (it costs the carrier nothing)
     * High-reputation carrier (4.8+) → can command 10% premium
   - ALWAYS explain your pricing logic in the reasoning field

3. BUNDLE DETECTION & DISCOUNTS
   - Check if multiple open requests share the same route or a sub-route
   - If bundling is possible: reduce per-requester fee by 15-30%
   - Carrier gets the FULL combined fee (bundling benefits the requester, not the carrier)
   - Set bundle_discount_applied: true and explain in reasoning

4. NEGOTIATION NOTES
   - If a carrier's asked price seems too high for the route, include a negotiation_note suggesting a counteroffer
   - If a requester's budget is too low, suggest a realistic minimum
   - Be conversational and helpful: "Alice's trip goes right through your city — this is zero effort for her. 3 TON is fair."
   - If no match exists, suggest what the requester could do: "No carriers on this route today. Try posting again tomorrow morning — this corridor is busy on weekdays."

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences, no extra text:
{
  "matches": [
    {
      "hops": [
        {
          "trip_id": 1,
          "carrier_id": 10,
          "carrier_name": "Alice M.",
          "from": "Lausanne",
          "to": "Geneva",
          "departure_time": "2026-03-22T09:00:00Z",
          "fee_ton": 3.5
        }
      ],
      "total_fee_ton": 3.5,
      "estimated_duration_hours": 1.5,
      "confidence": "high",
      "reasoning": "Direct match. Alice is driving this exact route, small package fits easily. Priced at 3.5 TON — short highway trip, zero detour.",
      "bundle_discount_applied": false,
      "negotiation_note": null
    }
  ],
  "no_match_reason": null
}
"""

3. Implement the matching function:

```typescript
export async function findMatches(requestId: number): Promise<AIMatchResult> {
  // Step 1: Fetch the request from DB
  // Step 2: Fetch ALL active trips from DB (with carrier names, reputations)
  // Step 3: Fetch other OPEN requests on similar routes (for bundle detection)
  // Step 4: Build the user prompt with all this context
  // Step 5: Call Claude API (model: claude-sonnet-4-6-20250514, max_tokens: 1500)
  // Step 6: Parse the JSON response (strip markdown fences if present, try/catch JSON.parse)
  // Step 7: Validate the response structure
  // Step 8: Return the result
}
```

The USER PROMPT should be built like this:

"""
ACTIVE CARRIER TRIPS:
{JSON array of all active trips with carrier names, reputations, prices}

DELIVERY REQUEST TO MATCH:
- Request ID: {id}
- From: {from_city}
- To: {to_city}
- Deadline: {deadline or 'flexible'}
- Package size: {package_size}
- Package description: {package_desc or 'standard package'}
- Budget: {budget_ton ? budget_ton + ' TON' : 'open — you set the price'}
- Urgency: {urgency}
- Is errand: {is_errand} {errand_details if applicable}

OTHER OPEN REQUESTS (for bundle detection):
{JSON array of other open requests, so you can spot bundling opportunities}

Find the best 1-3 route options. Set fair prices. Note any bundling opportunities.
"""

4. Create backend/src/routes/matches.ts:
   - POST /api/matches/find — body: { request_id }
     a) Call findMatches(request_id)
     b) For each match option, also compute the PriceDisplay (fiat conversion) using the price helper
     c) Store the TOP match as a 'proposed' match in the matches table + match_hops
     d) Response: { matches: AIRouteOption[], prices: PriceDisplay[], ton_price_usd: number }

   - POST /api/matches/:id/accept — body: { user_id }
     a) Update match status to 'accepted'
     b) Update related request status to 'matched'
     c) Update related trip(s) status to 'matched'
     d) Return { match: Match, hops: MatchHop[] }

   - POST /api/matches/:id/pickup — body: { hop_order }
     a) Update the specific hop status to 'picked_up'
     b) If hop_order === 1, update match status to 'in_transit'
     c) Return updated match + hops

   - POST /api/matches/:id/deliver — body: { hop_order }
     a) Update hop status to 'delivered'
     b) If ALL hops are 'delivered', update match status to 'delivered'
     c) Return updated match + hops

   - POST /api/matches/:id/confirm — body: { user_id }
     a) Update match status to 'confirmed'
     b) Update request status to 'confirmed'
     c) Award XP to carrier(s): XP_REWARDS.complete_trip_as_carrier per hop
     d) Award XP to requester: XP_REWARDS.complete_delivery_as_requester
     e) Increment total_trips / total_deliveries on user records
     f) Check for milestone badges (first-carry if total_deliveries === 1)
     g) Return { match, xp_awarded: { carrier: number, requester: number }, new_badges: string[] }

   - GET /api/matches/:id — return match with all hops, carrier info, and fiat prices

5. Mount: app.use('/api/matches', matchesRouter);

6. Add an error fallback in the findMatches function: if the Claude API call fails (network, rate limit, bad key), return a hardcoded response:
   { matches: [], no_match_reason: "Matching service temporarily unavailable. Please try again in a moment." }
   Log the actual error. Do not crash the server.

7. Verify: run seed, start server, then:
   curl -X POST http://localhost:3001/api/matches/find -H "Content-Type: application/json" -d '{"request_id": 1}'
   (This will fail if ANTHROPIC_API_KEY is placeholder — that's OK. Verify it returns the fallback gracefully.)

8. git commit -m "feat: AI matching engine with pricing, bundling, negotiation"
```

---

## PROMPT 4 — Telegram Bot
**Model: Sonnet | Est. time: 10 min | Person B**

```
Continue building CarryTON.

TASK: Build the Telegram bot with grammy. The bot handles: /start, /trip, notifications, and group broadcasts.

1. Create bot/src/index.ts:

```typescript
import { Bot, InlineKeyboard, Context } from 'grammy';
import 'dotenv/config';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://carryton.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Helper to call backend
async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

// /start — welcome message with Mini App button
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('Open CarryTON 📦', MINI_APP_URL);

  await ctx.reply(
    '📦 *CarryTON*\n\n' +
    '_Everyone\'s going somewhere. Someone\'s going your way._\n\n' +
    'Post trips, request deliveries, and let our AI find the perfect match.\n\n' +
    'Tap below to get started!',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );

  // Upsert user in backend
  const user = ctx.from;
  if (user) {
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: String(user.id),
        username: user.username || null,
        display_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      }),
    }).catch(console.error);
  }
});

// /trip <from> <to> <time> — quick trip posting
bot.command('trip', async (ctx) => {
  const text = ctx.message?.text || '';
  const parts = text.split(/\s+/).slice(1); // remove /trip

  if (parts.length < 3) {
    return ctx.reply(
      '📝 *Post a trip*\n\n' +
      'Usage: `/trip Lausanne Geneva 09:00`\n' +
      'Or open the app for the full form:',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().webApp('Post trip', `${MINI_APP_URL}/trip/new`),
      }
    );
  }

  const [from, to, time] = parts;
  // Create trip via backend
  // First get user
  const userData = await api(`/users/${ctx.from?.id}`).catch(() => null);
  if (!userData?.user) {
    return ctx.reply('Please /start first to register!');
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [hours, minutes] = time.split(':').map(Number);
  tomorrow.setHours(hours || 9, minutes || 0, 0, 0);

  const tripData = await api('/trips', {
    method: 'POST',
    body: JSON.stringify({
      carrier_id: userData.user.id,
      from_city: from,
      to_city: to,
      departure_time: tomorrow.toISOString(),
      max_size: 'small',
      max_weight_kg: 5,
    }),
  }).catch(console.error);

  if (tripData?.trip) {
    await ctx.reply(
      `✅ Trip posted!\n\n` +
      `🚗 ${from} → ${to}\n` +
      `🕐 ${time}\n` +
      `📦 Can carry: small package\n\n` +
      `Carriers can now find and accept deliveries on your route.`,
      {
        reply_markup: new InlineKeyboard().webApp('View trip', `${MINI_APP_URL}/trip/${tripData.trip.id}`),
      }
    );
  } else {
    await ctx.reply('Something went wrong. Try again or use the app.');
  }
});

// /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📦 *CarryTON Commands*\n\n' +
    '`/start` — Open the app\n' +
    '`/trip <from> <to> <time>` — Post a trip quickly\n' +
    '`/help` — This message\n\n' +
    'For full features, use the Mini App!',
    { parse_mode: 'Markdown' }
  );
});

bot.start();
console.log('🤖 CarryTON Bot is running');
```

2. Create bot/src/notifications.ts:
   Export these async functions (all take the bot instance as first arg):

   - notifyMatchFound(bot, telegramId, matchData) — sends:
     "🎯 Match found for your delivery!\n{from} → {to}\nCarrier: {name} ({rating}⭐)\nFee: {fee} TON (~{fiat})\n\nOpen the app to accept:"
     With InlineKeyboard webApp button to the match screen.

   - notifyJobAccepted(bot, carrierTelegramId, requesterTelegramId, matchData) — sends to both:
     To carrier: "📦 New job accepted! Pick up from {from} before {time}"
     To requester: "✅ {carrier_name} accepted your delivery. Escrow funded."

   - notifyPickup(bot, requesterTelegramId, hopData) — sends:
     "🚗 Your package is on the move!\n{carrier_name} picked up in {from}, heading to {to}"

   - notifyDelivered(bot, requesterTelegramId, matchData) — sends:
     "📬 Package delivered! Please confirm receipt in the app to release payment."
     With webApp button to the tracker screen.

   - notifyPaymentReleased(bot, carrierTelegramId, amount, fiat) — sends:
     "💰 Payment received!\n+{amount} TON (~{fiat})\nGreat job! Your reputation has been updated."

   - broadcastTripToGroup(bot, groupChatId, trip) — sends to a group:
     "🚗 New trip on CarryTON!\n{from} → {to} · {time}\nCarrier: {name} · Can carry {size}\n{price ? price + ' TON' : 'Price TBD'}\n\nNeed something delivered on this route?"
     With webApp button.

3. Update bot/package.json scripts: "dev": "ts-node src/index.ts", "start": "node dist/index.js"

4. git commit -m "feat: Telegram bot with commands and notifications"
```

---

## PROMPT 5 — Frontend Foundation + API Client + TON Connect
**Model: Sonnet | Est. time: 12 min | Person A starts here**

```
Continue building CarryTON.

TASK: Set up the frontend foundation: API client, TON Connect provider, Telegram Mini App SDK, global layout, and shared components.

1. Install dependencies:
   cd frontend
   npm install @tonconnect/ui-react @twa-dev/sdk

2. Create src/lib/api.ts:
   - const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
   - Export an `api` object with methods:
     * api.get(path) — fetch GET, return json
     * api.post(path, body) — fetch POST with JSON body, return json
     * api.patch(path, body) — fetch PATCH with JSON body, return json
   - Each method should handle errors gracefully: if response not ok, throw with the error message
   - Export specific typed functions:
     * getTrips(params?) → Trip[]
     * getRequests(params?) → DeliveryRequest[]
     * createTrip(data: CreateTripRequest & { carrier_id: number }) → Trip
     * createRequest(data: CreateDeliveryRequest & { requester_id: number }) → DeliveryRequest
     * findMatches(requestId: number) → MatchResponse
     * acceptMatch(matchId: number, userId: number) → Match
     * getMatch(matchId: number) → { match: Match, hops: MatchHop[] }
     * getTonPrice() → { ton_usd, ton_eur, ton_chf }
     * getUser(telegramId: string) → User
     * getUserAvatar(userId: number) → AvatarState
     * submitReview(data: ReviewRequest) → { review, new_badges }

3. Create src/lib/ton-price.ts:
   - A React hook: useTonPrice() that:
     * Fetches from /api/price/ton on mount
     * Returns { tonUsd, tonEur, tonChf, loading, formatTon }
     * formatTon(amount: number, currency?: 'CHF'|'EUR'|'USD') returns string like "3.5 TON (~CHF 8.75)"
     * The currency defaults to 'CHF' (we're in Switzerland for the demo)
     * Refetches every 5 minutes

4. Create src/lib/telegram.ts:
   - Wrap @twa-dev/sdk safely (it only works in browser):
   ```typescript
   export function getTelegramUser() {
     if (typeof window === 'undefined') return null;
     try {
       const WebApp = require('@twa-dev/sdk').default;
       return WebApp.initDataUnsafe?.user || null;
     } catch { return null; }
   }

   export function initTelegramApp() {
     if (typeof window === 'undefined') return;
     try {
       const WebApp = require('@twa-dev/sdk').default;
       WebApp.ready();
       WebApp.expand();
       WebApp.enableClosingConfirmation();
     } catch {}
   }

   export function getTelegramTheme(): 'light' | 'dark' {
     if (typeof window === 'undefined') return 'light';
     try {
       const WebApp = require('@twa-dev/sdk').default;
       return WebApp.colorScheme || 'light';
     } catch { return 'light'; }
   }
   ```

5. Create src/providers/TonProvider.tsx:
   ```typescript
   'use client';
   import { TonConnectUIProvider } from '@tonconnect/ui-react';

   export function TonProvider({ children }: { children: React.ReactNode }) {
     const manifestUrl = typeof window !== 'undefined'
       ? `${window.location.origin}/tonconnect-manifest.json`
       : '';

     return (
       <TonConnectUIProvider manifestUrl={manifestUrl}>
         {children}
       </TonConnectUIProvider>
     );
   }
   ```

6. Create public/tonconnect-manifest.json:
   {
     "url": "https://carryton.vercel.app",
     "name": "CarryTON",
     "iconUrl": "https://carryton.vercel.app/icon.png",
     "termsOfUseUrl": "https://carryton.vercel.app/terms",
     "privacyPolicyUrl": "https://carryton.vercel.app/privacy"
   }

7. Create src/providers/AppProvider.tsx:
   - A context provider that:
     * Initializes the Telegram Mini App on mount (call initTelegramApp)
     * Fetches the current user from backend using telegram_id
     * Stores: user, loading, tonPrice
     * Provides: { user, loading, tonPrice, formatTon, refreshUser }
   - Wrap children in TonProvider

8. Update src/app/layout.tsx:
   - Wrap everything in AppProvider
   - Set metadata: title "CarryTON", description "Community delivery network on Telegram"
   - Add viewport meta for mobile/TMA
   - Import Tailwind globals
   - Add the base HTML structure with suppressHydrationWarning

9. Create these shared components in src/components/:

   a) PriceTag.tsx — displays TON amount with fiat conversion:
      Props: { amount: number, size?: 'sm' | 'md' | 'lg', showFiat?: boolean }
      Renders: "3.5 TON" in the main font, "(~CHF 8.75)" in smaller muted text below/beside
      Uses the useTonPrice hook

   b) Badge.tsx — renders a user badge:
      Props: { badge: Badge, size?: 'sm' | 'md' }
      Renders: emoji + name in a small pill. Color based on tier:
        bronze = amber bg, silver = gray bg, gold = yellow bg

   c) CityRoute.tsx — renders a from→to route visual:
      Props: { from: string, to: string, departureTime?: string, carrierName?: string }
      Renders: [●] Lausanne ----→ [○] Geneva
      With optional time and carrier below

   d) Avatar.tsx — renders the evolving avatar:
      Props: { state: AvatarState, size?: 'sm' | 'md' | 'lg' }
      For hackathon: render as a colored circle with the level emoji/accessory inside:
        Level 1: 🧑 plain
        Level 2: 🎒 backpack
        Level 3: 🎩 hat
        Level 4: 🛵 scooter
        Level 5: 🚀 jetpack
      Background color shifts by level (gray → blue → purple → gold → rainbow gradient)
      Show a subtle progress ring around the avatar (SVG circle with stroke-dasharray based on progress_percent to next level)

10. Add to frontend/.env.local:
    NEXT_PUBLIC_API_URL=http://localhost:3001/api

11. Verify: run frontend dev server, confirm it loads without errors (blank page is fine at this point).

12. git commit -m "feat: frontend foundation, API client, TON Connect, shared components"
```

---

## PROMPT 6 — Home Feed Screen
**Model: Sonnet | Est. time: 10 min | Person A**

```
Continue building CarryTON frontend.

TASK: Build the Home Feed screen — the first thing users see. This is the app's front door and must look polished.

1. Create src/app/page.tsx (the home screen):

DESIGN SPEC:
- Top: CarryTON logo/text + wallet connect button (small, top right)
- Below: toggle tabs "Trips" | "Requests" (pill-style toggle, Telegram blue active state)
- Below: list of cards

TRIPS TAB (default):
- Fetch from GET /api/trips?status=active
- Each trip card shows:
  * Route visualization using CityRoute component (● Lausanne ---→ ○ Geneva)
  * Carrier avatar (use Avatar component) + name + reputation stars
  * Row of badges: departure time (green pill), package size (blue pill), price with fiat (amber pill)
  * If price is null, show "AI-priced" in a purple pill
- Cards should have white bg, subtle border, 12px border-radius, 14px padding
- Tap on card → navigate to /trip/[id] (create a placeholder page for now)

REQUESTS TAB:
- Fetch from GET /api/requests?status=open
- Each request card shows:
  * Route: From → To
  * Requester name + avatar
  * Badges: deadline, package size, budget with fiat, urgency (red pill if urgent)
  * If is_errand, show a "🏃 Errand" pill
- Tap on card → navigate to /request/[id] (placeholder)

BOTTOM NAV BAR:
- Fixed at bottom, 5 tabs: Home, Post, Match, Active, Profile
- Icons: use simple SVG icons (house, plus-circle, search, activity, user)
- Active tab highlighted in Telegram blue (#2AABEE)
- This nav bar should be a shared component: src/components/BottomNav.tsx
- It should appear on ALL pages. Put it in the layout, not individual pages.

FLOATING ACTION BUTTON:
- Bottom right, above the nav bar
- Telegram blue circle with white "+" icon
- On tap: show a small menu with two options: "Post a trip" and "Post a request"
- Tapping either navigates to /trip/new or /request/new

STYLING RULES:
- Use Tailwind exclusively
- Primary color: #2AABEE (Telegram blue)
- Background: white (respect Telegram theme for dark mode if possible, but white-first is fine for demo)
- Font: system font stack (-apple-system, sans-serif)
- Cards: bg-white border border-gray-100 rounded-xl p-4 shadow-sm
- Badge pills: rounded-full px-2.5 py-0.5 text-xs font-medium
- The whole page must feel like scrolling through a native Telegram interface

IMPORTANT: All prices must show fiat conversion. Use the PriceTag component for EVERY price display. Default currency: CHF.

LOADING STATE: Show skeleton cards (3 gray animated rectangles) while fetching data.

EMPTY STATE: If no trips/requests, show a friendly message: "No active trips yet. Be the first to post one!" with a button to post.

2. Create the BottomNav.tsx component as described above. Use next/navigation usePathname() to determine the active tab.

3. Move the BottomNav into the layout so it persists across pages.

4. Verify: the home feed renders with seeded data, cards look clean, toggle works, fiat prices show.

5. git commit -m "feat: home feed with trip/request cards and bottom nav"
```

---

## PROMPT 7 — Post Trip + Post Request Screens
**Model: Sonnet | Est. time: 10 min | Person A**

```
Continue building CarryTON frontend.

TASK: Build the Post Trip and Post Request form screens. These must feel effortless — 3 taps and done.

1. Create src/app/trip/new/page.tsx — Post a Trip form:

DESIGN: Clean form, no clutter. Each field is large and tappable.

FIELDS:
- From city: text input with autocomplete dropdown. Hardcode these cities for suggestions: Lausanne, Geneva, Zurich, Bern, Basel, Lyon, Paris, Montreux, Morges, Nyon, Fribourg, Neuchâtel, Sion, Yverdon, Lucerne, Interlaken, Strasbourg, Milan, Turin, Annecy
- To city: same autocomplete list
- Departure time: date + time picker. Default to tomorrow, next round hour.
- Package size: three large tappable buttons in a row — Small (📦), Medium (📦📦), Large (📦📦📦). Selected = filled Telegram blue, others = outline gray.
- Price (optional): number input with "TON" suffix. Below it, show real-time fiat conversion as user types: "= ~CHF X.XX". If left empty, show text: "Leave empty to let our AI suggest a fair price"
- Notes: optional textarea, placeholder "E.g., can pick up along A1 highway"

SUBMIT BUTTON: Large, full-width, Telegram blue: "Post trip 🚗"

ON SUBMIT:
- Get current user from AppProvider context
- POST to /api/trips with carrier_id = user.id
- On success: show a brief success toast "Trip posted!", then navigate to home
- On error: show inline error message

BACK BUTTON: Top left, arrow back, navigates to home.

2. Create src/app/request/new/page.tsx — Post a Request form:

FIELDS:
- From city: same autocomplete
- To city: same autocomplete
- Deadline: date + time picker. Default: tomorrow end of day. Show "flexible" toggle — if on, no deadline.
- Package size: same three-button selector
- Package description: text input, placeholder "Blue backpack, small envelope, etc."
- Budget (optional): number input with TON suffix + live fiat conversion. If empty: "Our AI will suggest a fair price based on the route"
- Urgency toggle: normal (default) | urgent. If urgent, show warning: "Urgent adds ~50% to the fee but gets priority matching"
- Errand mode toggle: "This is an errand (carrier must pick something up for me)". If ON, show:
  - Errand details: textarea, placeholder "Pick up parcel ref 348XZ from Geneva Post Office, Rue du Mont-Blanc 18"

SUBMIT BUTTON: "Find a carrier 🔍"

ON SUBMIT:
- POST to /api/requests with requester_id = user.id
- Then IMMEDIATELY call POST /api/matches/find with the new request_id
- Navigate to /match/[request_id] to show results (this screen built in next prompt)

3. Create src/components/CityAutocomplete.tsx:
   - A reusable input component
   - Shows a dropdown of filtered cities as user types (min 1 character)
   - Tapping a suggestion fills the input and closes the dropdown
   - The city list is the hardcoded array above
   - Styled to look native: white dropdown with subtle shadow, items with padding

4. Verify: both forms render, autocomplete works, size selector toggles.

5. git commit -m "feat: post trip and post request form screens"
```

---

## PROMPT 8 — Match Results Screen (The Money Screen)
**Model: Opus | Est. time: 15 min | Person A**

```
Continue building CarryTON frontend.

TASK: Build the Match Results screen. This is the MOST IMPORTANT screen in the app — it's where the AI magic becomes visible, and it's the centerpiece of the demo.

1. Create src/app/match/[requestId]/page.tsx:

This screen shows after a user posts a delivery request. It calls the matching API and displays the AI's route proposals.

FLOW:
- On mount: if match results aren't in state already, call POST /api/matches/find with { request_id: params.requestId }
- Show a loading state while AI is thinking: animated "🔍 Finding the best route..." with a subtle pulsing animation. Below it, cycle through messages every 2 seconds: "Checking 8 active carriers...", "Analyzing multi-hop routes...", "Calculating optimal pricing...", "Almost there..."
- When results arrive: render the match cards

LAYOUT:

TOP SECTION — Request summary card:
- Gray background card
- "YOUR REQUEST" label (small, muted)
- Route: "Lausanne → Lyon" (large, bold)
- Row of pills: package size, budget (with fiat), urgency badge if urgent, errand badge if errand
- If errand: show errand details below in small text

SUBHEADER:
- "🤖 AI found {N} routes from {M} active trips"
- Small text, muted

MATCH CARDS (one per route option):

Each card has:
- Top right corner: confidence badge — "Best match" (green) for high, "Good option" (blue) for medium, "Alternative" (gray) for low
- Top: "OPTION {N} — {Single hop / Multi-hop relay}" label
- HOP VISUALIZATION — this is the key visual:
  For single hop:
    [● City A] ——carrier name——→ [● City B]
  For multi-hop:
    [● City A] ——Alice M.——→ [◉ City B (relay)] ——Marco R.——→ [● City C]

  Build this as a flex row. Each city is a dot + city name vertically. Between cities is a line with an arrowhead and the carrier name below the line. For relay cities, the dot should be a ring (◉) to indicate handoff.

  Use these colors: start city = Telegram blue dot, end city = Telegram blue dot, relay city = purple dot. Lines = Telegram blue with dashed style.

- CARRIER INFO: For each hop, show a small row with carrier avatar, name, reputation, departure time

- AI REASONING: Show the AI's reasoning text in a subtle italic block below the hops. This is where the AI explains its pricing: "Direct match. Alice is driving this exact route, small package fits easily. Priced at 3.5 TON — short highway trip, zero detour."

- If bundle_discount_applied is true, show a green banner: "🎁 Bundle discount! Your package shares this route with another delivery — you save 20%"

- If negotiation_note is not null, show in an info box: "💡 {negotiation_note}"

- PRICE SECTION: bottom of card, separated by a thin line
  Left: "Total fee" label + large price in TON + fiat below (use PriceTag, size lg)
  Center: "Est. arrival" + duration
  Right: carrier avatar(s) stacked

- ACTION BUTTON:
  For the best match (first card): full-width Telegram blue button "Accept & pay {X} TON (~CHF Y)"
  For alternatives: outline button with same text

WHEN USER TAPS "Accept & pay":
  - If wallet not connected: trigger TON Connect wallet connection first
  - Then: call POST /api/matches/{id}/accept
  - Show brief success animation
  - Navigate to /job/{matchId} (the tracker screen)

  NOTE: For the hackathon demo, we may not actually send a TON transaction. The button should:
  1. Try to send via TON Connect if wallet is connected
  2. If TON Connect fails or isn't available, just call the accept API anyway (mock payment)
  3. Either way, the UX flow continues to the tracker

NO MATCH STATE:
- If matches array is empty, show:
  "😕 No carriers on this route right now"
  + the AI's no_match_reason text
  + "We'll notify you when a matching trip is posted" button
  + "Modify your request" button → back to the request form

2. Create src/components/HopVisualization.tsx:
   A reusable component that takes an array of hops and renders the visual route.
   Props: { hops: AIHop[], size?: 'sm' | 'md' }

   Implementation:
   - Flex row with cities and connecting arrows
   - Each city: small dot (12px circle, SVG or div) + city name below
   - Between cities: horizontal line with arrow + carrier name below
   - For multi-hop: relay cities get a double-ring dot
   - Responsive: if too wide, stack vertically on small screens

3. Verify: navigate to /match/1 (hardcode a test), confirm the loading animation shows, then the results render (will need seed data + working match API).

4. git commit -m "feat: match results screen with AI route visualization"
```

---

## PROMPT 9 — Active Job Tracker Screen
**Model: Sonnet | Est. time: 8 min | Person A**

```
Continue building CarryTON frontend.

TASK: Build the Active Job Tracker — shows real-time delivery status with a step-by-step timeline.

1. Create src/app/job/[matchId]/page.tsx:

FLOW:
- On mount: GET /api/matches/{matchId} to fetch match + hops
- Poll every 15 seconds for status updates (setInterval)

LAYOUT:

TOP CARD — delivery summary:
- "Active delivery" label
- Route: "Lausanne → Lyon"
- Status badge: color-coded pill based on match status
  accepted = blue, in_transit = amber, delivered = green, confirmed = green+check

TIMELINE (the main visual):
Vertical stepper with these steps:
1. "Match accepted" — when: match.created_at, detail: "Escrow funded: {fee} TON"
2. For EACH hop in order:
   "Picked up by {carrier_name}" — when: hop status changes to picked_up, detail: "Hop {N}: {from} → {to}"
   "Handed off" or "Delivered by {carrier_name}" — when: hop delivered

3. "Delivered" — when all hops delivered
4. "Confirmed & paid" — when match confirmed, detail: "Payment released to carrier(s)"

Each step has:
- A dot on the left: green check circle if done, blue pulsing dot if current, gray circle if pending
- A vertical line connecting dots: blue if done, gray if pending
- Title text + timestamp
- Optional detail text in muted color

IF USER IS REQUESTER and match status is 'delivered':
Show a big button at the bottom: "Confirm delivery & release payment ✅"
Tapping it: POST /api/matches/{id}/confirm
Then show a celebration: "🎉 Payment released! Carrier earned {X} TON"
Then show the review prompt (below)

IF USER IS CARRIER and hop status is 'pending':
Show button: "Mark as picked up 📦"
If hop status is 'picked_up':
Show button: "Mark as delivered ✅"

REVIEW PROMPT (shows after confirmation):
- "How was your experience with {carrier/requester}?"
- 5 tappable stars
- Quick tags: "Fast", "Friendly", "Careful", "Great communication", "Professional"
- Optional comment text area
- Submit → POST /api/reviews
- On success: show any new badges earned: "🏆 You earned: {badge emoji} {badge name}!"

ESCROW INFO CARD (bottom):
- "Escrow status" header
- Row: "Locked amount" → "{fee} TON (~CHF Y)"
- Row: "Contract" → "{escrow_address}" (truncated, or "Mock escrow" for demo)
- Row: "Auto-refund in" → countdown timer (24h from match creation). Use a live countdown that updates every second.

2. Verify: navigate to /job/1 (will need a seeded match in the database).

3. git commit -m "feat: job tracker with timeline, confirm, and review"
```

---

## PROMPT 10 — Profile Screen + Avatar + Badges
**Model: Sonnet | Est. time: 10 min | Person A**

```
Continue building CarryTON frontend.

TASK: Build the Profile screen with avatar evolution, badges, stats, and activity history.

1. Create src/app/profile/page.tsx:

LAYOUT:

TOP — Avatar section:
- Centered: large Avatar component (size 'lg', 80px)
- Show the progress ring around the avatar (SVG) — percent toward next level
- Below avatar: user display_name (large, bold)
- Below: @username + "Member since {month year}"
- Below: reputation stars (★★★★☆ style) + numeric value
- Below: level name badge — e.g. "🎒 Backpacker — Level 2" in a colored pill
- Below: XP progress bar — "120 / 150 XP to next level" with a filled bar

STATS GRID — 2x2 or 3 column grid:
- Trips posted: number
- Deliveries: number
- TON earned: sum from completed matches (calculate or get from backend — for demo, show a static number from seed data)
- Reputation: the star rating

BADGES SECTION:
- "Your badges" header
- Grid of earned badges (use Badge component)
- Each badge: emoji + name + tier color (bronze/silver/gold border)
- Unearned badges: show grayed out with "?" icon and a tooltip/text "Complete 5+ deliveries to earn this"
- This should feel like an achievement wall — satisfying to look at

WALLET SECTION:
- Card with wallet connection status
- If connected: show truncated address + "Disconnect" link
- If not connected: show TON Connect button "Connect wallet"
- Below: "Balance on TON" — for demo, just show "Testnet" with a link to the faucet

ACTIVITY HISTORY:
- "Recent activity" header
- List of recent matches/trips, sorted newest first
- Each item: route (from→to), role (Carrier/Requester), date, amount (+X or -X TON), status badge
- Max 10 items

2. Create src/components/XPProgressBar.tsx:
   Props: { current: number, max: number, level: number, levelName: string }
   Renders: horizontal bar with filled portion, percentage text, level name

3. Create src/components/BadgeGrid.tsx:
   Props: { earned: UserBadge[], all: Badge[] }
   Renders: grid of all possible badges, earned ones colored, unearned ones grayed out

4. Verify: /profile renders with seeded user data.

5. git commit -m "feat: profile screen with avatar, badges, XP progress"
```

---

## PROMPT 11 — Smart Contract (Tact Escrow)
**Model: Opus | Est. time: 15 min | Person B**

```
Continue building CarryTON.

TASK: Write the TON escrow smart contract in Tact and set up the build pipeline. If Tact compilation fails, create the mock escrow fallback.

1. Set up the contract project:
   cd contract
   npm init -y
   npm install -D @tact-lang/compiler

   Create a tact.config.json:
   {
     "projects": [{
       "name": "CarryTonEscrow",
       "path": "./contracts/CarryTonEscrow.tact",
       "output": "./build"
     }]
   }

2. Create contracts/CarryTonEscrow.tact:

```tact
import "@stdlib/deploy";

message FundEscrow {
    carrier: Address;
    deadline: Int as uint32;
}

message ConfirmDelivery {}
message ConfirmReceipt {}
message Refund {}

contract CarryTonEscrow with Deployable {
    owner: Address;              // protocol wallet — receives fees
    requester: Address;
    carrier: Address;
    amount: Int as coins;
    deadline: Int as uint32;
    carrierConfirmed: Bool;
    requesterConfirmed: Bool;
    released: Bool;
    protocolFeeBps: Int as uint16;  // 500 = 5%

    init(owner: Address) {
        self.owner = owner;
        self.requester = newAddress(0, 0);
        self.carrier = newAddress(0, 0);
        self.amount = 0;
        self.deadline = 0;
        self.carrierConfirmed = false;
        self.requesterConfirmed = false;
        self.released = false;
        self.protocolFeeBps = 500;
    }

    receive(msg: FundEscrow) {
        require(self.amount == 0, "Already funded");
        require(context().value > 0, "Must send TON");
        self.requester = sender();
        self.carrier = msg.carrier;
        self.amount = context().value;
        self.deadline = msg.deadline;
    }

    receive(msg: ConfirmDelivery) {
        require(sender() == self.carrier, "Only carrier can confirm delivery");
        require(!self.released, "Already released");
        self.carrierConfirmed = true;
        if (self.carrierConfirmed && self.requesterConfirmed) {
            self.release();
        }
    }

    receive(msg: ConfirmReceipt) {
        require(sender() == self.requester, "Only requester can confirm receipt");
        require(!self.released, "Already released");
        self.requesterConfirmed = true;
        if (self.carrierConfirmed && self.requesterConfirmed) {
            self.release();
        }
    }

    receive(msg: Refund) {
        require(sender() == self.requester, "Only requester can request refund");
        require(!self.released, "Already released");
        require(now() > self.deadline, "Deadline not passed yet");
        self.released = true;
        send(SendParameters{
            to: self.requester,
            value: 0,
            mode: SendRemainingBalance + SendDestroyIfZero,
            body: "Refund".asComment()
        });
    }

    fun release() {
        self.released = true;
        let fee: Int = self.amount * self.protocolFeeBps / 10000;
        let payout: Int = self.amount - fee;

        send(SendParameters{
            to: self.carrier,
            value: payout,
            mode: 0,
            body: "CarryTON payment".asComment()
        });

        send(SendParameters{
            to: self.owner,
            value: 0,
            mode: SendRemainingBalance + SendDestroyIfZero,
            body: "Protocol fee".asComment()
        });
    }

    get fun state(): String {
        if (self.released) { return "released"; }
        if (self.amount > 0) { return "funded"; }
        return "empty";
    }

    get fun escrowDetails(): map<Int, Int> {
        // Return amount and deadline for frontend
        let m: map<Int, Int> = emptyMap();
        return m;
    }
}
```

3. Try to compile:
   npx tact --config tact.config.json

   If compilation succeeds: great, note the output files in build/.
   If it fails: that's fine for a hackathon. Note the error and proceed with the mock.

4. Create backend/src/services/escrow.ts (MOCK ESCROW — always create this regardless of Tact success):

```typescript
// Mock escrow for hackathon demo — same state machine as the real contract
interface MockEscrow {
  id: string;
  requester_wallet: string;
  carrier_wallet: string;
  amount_ton: number;
  protocol_fee_ton: number;
  state: 'empty' | 'funded' | 'released' | 'refunded';
  carrier_confirmed: boolean;
  requester_confirmed: boolean;
  created_at: number;
  deadline: number;  // Unix timestamp
}

const escrows = new Map<string, MockEscrow>();

export function createEscrow(matchId: number, requester: string, carrier: string, amount: number, feeBps: number = 500): MockEscrow {
  const fee = amount * feeBps / 10000;
  const escrow: MockEscrow = {
    id: `escrow_${matchId}`,
    requester_wallet: requester,
    carrier_wallet: carrier,
    amount_ton: amount,
    protocol_fee_ton: fee,
    state: 'funded',
    carrier_confirmed: false,
    requester_confirmed: false,
    created_at: Date.now(),
    deadline: Date.now() + 24 * 60 * 60 * 1000,
  };
  escrows.set(escrow.id, escrow);
  return escrow;
}

export function confirmDelivery(escrowId: string, role: 'carrier' | 'requester'): MockEscrow {
  const e = escrows.get(escrowId);
  if (!e) throw new Error('Escrow not found');
  if (e.state === 'released') throw new Error('Already released');

  if (role === 'carrier') e.carrier_confirmed = true;
  if (role === 'requester') e.requester_confirmed = true;

  if (e.carrier_confirmed && e.requester_confirmed) {
    e.state = 'released';
    // In real version: trigger on-chain release
    console.log(`[Escrow] Released: ${e.amount_ton - e.protocol_fee_ton} TON to carrier, ${e.protocol_fee_ton} TON protocol fee`);
  }
  return e;
}

export function refundEscrow(escrowId: string): MockEscrow {
  const e = escrows.get(escrowId);
  if (!e) throw new Error('Escrow not found');
  if (e.state === 'released') throw new Error('Already released');
  if (Date.now() < e.deadline) throw new Error('Deadline not passed');

  e.state = 'refunded';
  console.log(`[Escrow] Refunded: ${e.amount_ton} TON to requester`);
  return e;
}

export function getEscrow(escrowId: string): MockEscrow | undefined {
  return escrows.get(escrowId);
}
```

5. Wire the escrow into the match accept flow in backend/src/routes/matches.ts:
   In POST /matches/:id/accept, after updating the match status:
   - Import { createEscrow } from '../services/escrow'
   - Create an escrow: createEscrow(matchId, requesterWallet || 'mock_requester', carrierWallet || 'mock_carrier', match.total_fee_ton)
   - Store the escrow ID in the match record (update escrow_address field)

   In POST /matches/:id/confirm:
   - Import { confirmDelivery } from '../services/escrow'
   - Call confirmDelivery on the escrow

6. Add package.json script: "build:contract": "npx tact --config tact.config.json"

7. git commit -m "feat: Tact escrow contract + mock escrow fallback"
```

---

## PROMPT 12 — Frontend Polish + Dark Mode + Animations
**Model: Sonnet | Est. time: 10 min | Person A**

```
Continue building CarryTON frontend.

TASK: Polish the entire frontend — loading states, animations, dark mode, toast notifications, and consistent styling.

1. Create src/components/Toast.tsx:
   - A simple toast notification component
   - Appears at the top of the screen, slides down, auto-dismisses after 3 seconds
   - Three variants: success (green), error (red), info (blue)
   - Create a ToastProvider and useToast() hook:
     const { showToast } = useToast();
     showToast('Trip posted!', 'success');

2. Create src/components/Skeleton.tsx:
   - A reusable skeleton/shimmer loading component
   - Props: { lines?: number, height?: string, className?: string }
   - Renders gray boxes with a shimmer animation (CSS keyframes, light-to-dark-to-light sweep)
   - Create a TripCardSkeleton that mimics the trip card shape

3. Dark mode support:
   - In tailwind.config.ts, set darkMode: 'class'
   - In the AppProvider, detect Telegram theme (getTelegramTheme()) and set the class on <html>
   - Go through ALL existing components and pages, add dark: variants:
     * Cards: bg-white dark:bg-gray-900, border-gray-100 dark:border-gray-800
     * Text: text-gray-900 dark:text-white for primary, text-gray-500 dark:text-gray-400 for secondary
     * Inputs: bg-white dark:bg-gray-800
     * Background: bg-gray-50 dark:bg-black
   - The Telegram blue (#2AABEE) stays the same in both modes

4. Add micro-animations:
   - Card tap: add active:scale-[0.98] transition-transform to all tappable cards
   - Page transitions: add a subtle fade-in (opacity 0 → 1 over 200ms) on each page mount
   - Button loading state: when a button is in loading state, show a spinner (small SVG circle animation) instead of text
   - Tab switch: smooth opacity transition between Trips and Requests tabs
   - Success celebration: when a delivery is confirmed, show a brief confetti-like animation (can be simple: 🎉 emoji that scales up and fades)

5. Create src/components/EmptyState.tsx:
   Props: { icon: string (emoji), title: string, description: string, actionLabel?: string, onAction?: () => void }
   Renders: centered layout with large emoji, title, description, optional action button

6. Error boundary: Create src/components/ErrorBoundary.tsx that catches React errors and shows a friendly "Something went wrong" message with a "Try again" button.

7. Go through every page and ensure:
   - Loading states use Skeleton components
   - Empty states use EmptyState component
   - All API calls have try/catch with error toasts
   - All buttons have loading states during API calls
   - No unstyled default HTML anywhere

8. Verify: toggle between light and dark mode (add a temporary button in the header to test). Check that everything is readable in both modes.

9. git commit -m "feat: UI polish, dark mode, animations, loading states"
```

---

## PROMPT 13 — Integration Testing + Demo Data + Final Wiring
**Model: Opus | Est. time: 12 min | Person B**

```
Continue building CarryTON.

TASK: Wire everything together end-to-end. Test the complete happy path. Fix any broken connections.

1. Update the seed script (backend/src/seed.ts) to also create:
   - One COMPLETED match (to show in activity history):
     Request: from Alice (requester) for Zurich→Bern, matched to Sophie's trip
     Match: status 'confirmed', total_fee 5.0, protocol_fee 0.25, carrier_payout 4.75
     1 hop: Sophie, Zurich→Bern
     Review: Alice gave Sophie 5 stars, tags: ['fast', 'friendly']

   - One IN-TRANSIT match (to show on the tracker screen):
     Request: from Bob for Lausanne→Lyon
     Match: status 'in_transit', total_fee 8.5, protocol_fee 0.43
     2 hops: Alice (Lausanne→Geneva, status 'delivered'), Marco (Geneva→Lyon, status 'picked_up')

2. Create a test script: backend/src/test-flow.ts
   This script tests the ENTIRE happy path via HTTP:
   - GET /api/trips → verify 8 trips returned
   - POST /api/requests → create a new request (Lausanne → Geneva, small, 5 TON budget)
   - POST /api/matches/find → find matches (this calls Claude API — will need a real key)
   - Log the match results
   - POST /api/matches/:id/accept
   - POST /api/matches/:id/pickup (hop 1)
   - POST /api/matches/:id/deliver (hop 1)
   - POST /api/matches/:id/confirm
   - POST /api/reviews → 5 stars
   - GET /api/users/tg_alice → verify XP increased
   - Log: "✅ Full flow test passed" or "❌ Failed at step X"
   Add script: "test:flow": "ts-node src/test-flow.ts"

3. Ensure the frontend API client base URL works:
   - In development: http://localhost:3001/api
   - Add CORS properly in backend for localhost:3000

4. Create backend/src/routes/demo.ts:
   - GET /api/demo/reset — re-runs the seed (for live demo: resets all data to clean state)
   - GET /api/demo/status — returns counts of all entities (users, trips, requests, matches)
   Mount this router.

5. Create a test user flow in the frontend:
   - If no Telegram context is detected (running in regular browser, not TMA), auto-login as "tg_bob" (user ID 2)
   - This makes development and demo testing possible outside Telegram
   - In src/providers/AppProvider.tsx: if getTelegramUser() returns null, use a fallback: { id: 'tg_bob', username: 'bob_sends', first_name: 'Bob', last_name: 'W.' }

6. Verify end-to-end:
   a) Start backend: cd backend && npm run seed && npm run dev
   b) Start frontend: cd frontend && npm run dev
   c) Open http://localhost:3000 in browser
   d) Home feed shows 8 trips
   e) Post a request → see AI match results
   f) Accept a match → navigate to tracker
   g) Profile shows badges and XP

7. git commit -m "feat: end-to-end integration, demo data, test script"
```

---

## PROMPT 14 — README + Deployment Prep
**Model: Sonnet | Est. time: 8 min | Either person**

```
Continue building CarryTON.

TASK: Write the README, prepare deployment configs, and create the pitch preparation assets.

1. Create/update the root README.md:

```markdown
# CarryTON 📦

> Everyone's going somewhere. Someone's going your way.

A community delivery and errand network that lives inside Telegram. AI-powered route matching with intelligent pricing. TON escrow payments. Zero fleet required.

## How it works

1. **Carriers** post their trips: "I'm driving Lausanne → Geneva at 9am"
2. **Requesters** post delivery needs: "Send my package from Lausanne to Lyon"
3. **AI agent** finds the best route — including multi-hop relays through intermediate carriers — and sets fair prices
4. **TON escrow** locks payment until both sides confirm delivery
5. **Badges & avatars** evolve as users build reputation

## Key features

- **AI matching engine** — Claude-powered agent finds optimal single-hop and multi-hop routes
- **Intelligent pricing** — AI sets fair prices based on distance, effort, urgency, and supply/demand
- **Bundle discounts** — Multiple packages on the same route get automatic discounts
- **TON escrow** — Trustless payment with 24h auto-refund protection
- **Fiat price display** — All TON prices show local currency equivalent (CHF/EUR/USD)
- **Gamification** — Evolving avatars, achievement badges, XP progression
- **Telegram-native** — Runs as a Mini App, bot broadcasts to local groups

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + SQLite |
| AI | Claude API (claude-sonnet-4-6) |
| Blockchain | TON (Tact escrow contract) |
| Bot | Telegram Bot API (grammy) |
| Wallet | TON Connect |
| Distribution | Telegram Mini App |

## Quick start

```bash
# Clone
git clone https://github.com/your-team/carryton.git
cd carryton

# Backend
cd backend
cp .env.example .env  # Fill in your API keys
npm install
npm run seed
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev

# Bot (new terminal)
cd bot
cp .env.example .env  # Fill in bot token
npm install
npm run dev
```

Open http://localhost:3000 to see the app.

## Live demo

- Telegram bot: @CarryTON_bot
- Mini App: [link]
- Testnet contract: [address]

## Architecture

```
User ←→ Telegram Mini App (Next.js)
              ↕
         REST API (Express)
         ↕          ↕
    SQLite DB    Claude API (matching + pricing)
         ↕
    TON Escrow Contract (Tact)
         ↕
    Telegram Bot (notifications + broadcasts)
```

## Monetization

5% protocol fee on each settled delivery, taken from escrow at release. AI token cost per match: ~$0.02 — negligible against fee revenue.

## Team

Built at Alphaton 2026, BSA EPFL.
```

2. Create .env.example files for each sub-project (backend, bot, frontend) with placeholder values and comments.

3. Create a Vercel config for frontend:
   frontend/vercel.json:
   { "buildCommand": "npm run build", "outputDirectory": ".next" }

4. Create a simple Dockerfile for backend (for Railway/Render):
   ```dockerfile
   FROM node:20-slim
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build
   EXPOSE 3001
   CMD ["npm", "start"]
   ```

5. Create a scripts/demo-reset.sh:
   ```bash
   #!/bin/bash
   echo "Resetting demo data..."
   cd backend && npm run seed
   echo "Done! Demo data reset."
   ```

6. git commit -m "docs: README, deployment configs, demo prep"
```

---

## Execution Summary

| Prompt | Who | Model | Est. Time | What |
|--------|-----|-------|-----------|------|
| 0 | B | Opus | 10 min | Scaffolding + shared types |
| 1 | B | Sonnet | 8 min | Database + seed data |
| 2 | B | Sonnet | 12 min | CRUD API routes + price |
| 3 | B | Opus | 15 min | AI matching engine |
| 4 | B | Sonnet | 10 min | Telegram bot |
| 5 | A | Sonnet | 12 min | Frontend foundation |
| 6 | A | Sonnet | 10 min | Home feed screen |
| 7 | A | Sonnet | 10 min | Post trip/request |
| 8 | A | Opus | 15 min | Match results screen |
| 9 | A | Sonnet | 8 min | Job tracker |
| 10 | A | Sonnet | 10 min | Profile + avatar + badges |
| 11 | B | Opus | 15 min | Smart contract + mock |
| 12 | A | Sonnet | 10 min | UI polish + dark mode |
| 13 | B | Opus | 12 min | Integration + testing |
| 14 | Either | Sonnet | 8 min | README + deployment |

**Total: ~165 min coding (~2.75 hours of Claude Code time)**
**Remaining time: pitch prep, deployment, bug fixes, rehearsal**

### Parallel execution timeline:
```
Person A: [5] → [6] → [7] → [8] → [9] → [10] → [12]
Person B: [0] → [1] → [2] → [3] → [4] → [11] → [13] → [14]
```
Both can start simultaneously after Prompt 0 (B does 0, then shares the repo with A who starts at 5).
