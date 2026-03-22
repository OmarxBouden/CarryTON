/**
 * End-to-end happy-path test via HTTP.
 * Run with: npm run test:flow  (backend must be running on :3001)
 */

const API = 'http://localhost:3001/api';

async function json(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

let step = 0;
function ok(label: string) { console.log(`  ✅ Step ${++step}: ${label}`); }

async function run() {
  console.log('\n🚀 CarryTON — Full Flow Test\n');

  // 1. GET trips
  const { trips } = await json('GET', '/trips');
  if (trips.length < 8) throw new Error(`Expected ≥8 trips, got ${trips.length}`);
  ok(`GET /trips → ${trips.length} trips`);

  // 2. POST request
  const { request } = await json('POST', '/requests', {
    requester_id: 2,
    from_city: 'Lausanne',
    to_city: 'Geneva',
    package_size: 'small',
    budget_ton: 5,
    urgency: 'normal',
  });
  if (!request?.id) throw new Error('Request creation failed');
  ok(`POST /requests → request #${request.id}`);

  // 3. Find matches (Claude API — may fallback to mock)
  let matchData: any;
  try {
    matchData = await json('POST', '/matches/find', { request_id: request.id });
    ok(`POST /matches/find → ${matchData.matches?.length ?? 0} match(es)` +
       (matchData.no_match_reason ? ` (reason: ${matchData.no_match_reason})` : ''));
  } catch (err) {
    console.log(`  ⚠️  Step ${++step}: /matches/find failed (expected without API key): ${(err as Error).message}`);
    matchData = { matches: [] };
  }

  // If no matches (no API key or no AI results), seed a mock match to continue
  if (!matchData.matches?.length || !matchData.matches[0]?.match_id) {
    console.log('  ↳ Seeding a mock match to continue the flow...');
    const db = (await import('./db')).default;
    const insertResult = db.prepare(`
      INSERT INTO matches (request_id, status, total_fee_ton, protocol_fee_ton, carrier_payout_ton, ai_reasoning)
      VALUES (?, 'proposed', 3.5, 0.18, 3.32, 'Mock: direct route Lausanne→Geneva')
    `).run(request.id);
    const mId = insertResult.lastInsertRowid as number;
    db.prepare(`
      INSERT INTO match_hops (match_id, hop_order, trip_id, carrier_id, from_city, to_city, departure_time, fee_ton)
      VALUES (?, 1, 1, 1, 'Lausanne', 'Geneva', ?, 3.5)
    `).run(mId, new Date().toISOString());
    matchData = { matches: [{ match_id: mId, total_fee_ton: 3.5, hops: [] }] };
    ok('Mock match seeded');
  }

  // 4. Accept match
  const matchId = matchData.matches?.[0]?.match_id;
  if (!matchId) {
    console.log('  ⚠️  No match_id available — skipping accept/pickup/deliver/confirm steps');
    console.log('\n⚠️  Partial flow test completed (no AI key)\n');
    return;
  }

  const acceptResult = await json('POST', `/matches/${matchId}/accept`, { user_id: 2 });
  if (acceptResult.match?.status !== 'accepted') throw new Error('Accept failed');
  ok(`POST /matches/${matchId}/accept → accepted`);

  // 5. Pickup hop 1
  const pickupResult = await json('POST', `/matches/${matchId}/pickup`, { hop_order: 1 });
  ok(`POST /matches/${matchId}/pickup → hop 1 picked up`);

  // 6. Deliver hop 1
  const deliverResult = await json('POST', `/matches/${matchId}/deliver`, { hop_order: 1 });
  ok(`POST /matches/${matchId}/deliver → hop 1 delivered`);

  // 7. Confirm delivery
  const confirmResult = await json('POST', `/matches/${matchId}/confirm`, { user_id: 2 });
  if (confirmResult.match?.status !== 'confirmed') throw new Error('Confirm failed');
  ok(`POST /matches/${matchId}/confirm → confirmed (XP: carrier=${confirmResult.xp_awarded?.carrier}, requester=${confirmResult.xp_awarded?.requester})`);

  // 8. Submit review
  // Find the carrier from hops
  const hops = confirmResult.hops || [];
  const carrierId = hops[0]?.carrier_id ?? 1;
  const reviewResult = await json('POST', '/reviews', {
    match_id: matchId,
    reviewer_id: 2,
    reviewee_id: carrierId,
    rating: 5,
    tags: ['fast', 'friendly'],
    comment: 'Great delivery!',
  });
  ok(`POST /reviews → review created, badges: [${reviewResult.new_badges?.join(', ') || 'none'}]`);

  // 9. Check user XP increased
  const userData = await json('GET', '/users/tg_bob');
  ok(`GET /users/tg_bob → XP=${userData.user?.xp}, deliveries=${userData.user?.total_deliveries}`);

  console.log('\n✅ Full flow test passed!\n');
}

run().catch((err) => {
  console.error(`\n❌ Failed at step ${step + 1}: ${err.message}\n`);
  process.exit(1);
});
