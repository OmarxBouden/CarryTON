/**
 * CarryTON — AI Matching Engine (CFF-style)
 *
 * Search strategies (like a train app but for community deliveries):
 * 1. Direct match: trip A→B matches request A→B
 * 2. Sub-route ("on my way"): trip A→C covers request A→B if B is on the way
 * 3. Multi-hop relay: trip A→C + trip C→B = request A→B
 * 4. Sub-route + relay combos: trip A→C covers A→B, trip D→E covers B→E
 *
 * Two-tier: LLM first (Groq/Ollama/Claude), algorithm fallback.
 */

import db from '../db';
import { AIMatchResult, AIRouteOption, AIHop } from '../../shared/types';
import { callLLM } from './llm-provider';

// ═══════════════════════════════════════════════════════════════
// GEOGRAPHY — Coordinate-based, zero hardcoded corridors
// ═══════════════════════════════════════════════════════════════

const CITY_ALIASES: Record<string, string> = {
  'genève': 'Geneva', 'geneve': 'Geneva', 'geneva': 'Geneva',
  'lausanne': 'Lausanne', 'zürich': 'Zurich', 'zurich': 'Zurich',
  'bern': 'Bern', 'berne': 'Bern', 'basel': 'Basel', 'bâle': 'Basel',
  'lyon': 'Lyon', 'paris': 'Paris', 'montreux': 'Montreux',
  'morges': 'Morges', 'nyon': 'Nyon', 'fribourg': 'Fribourg',
  'neuchâtel': 'Neuchâtel', 'neuchatel': 'Neuchâtel',
  'sion': 'Sion', 'yverdon': 'Yverdon', 'lucerne': 'Lucerne',
  'interlaken': 'Interlaken', 'strasbourg': 'Strasbourg',
  'milan': 'Milan', 'turin': 'Turin', 'annecy': 'Annecy',
};

function norm(c: string): string { return CITY_ALIASES[c.trim().toLowerCase()] || c.trim(); }
function eq(a: string, b: string): boolean { return norm(a).toLowerCase() === norm(b).toLowerCase(); }

// City coordinates [lat, lng] — the only data needed to compute any route relationship
const COORDS: Record<string, [number, number]> = {
  'Lausanne':    [46.5197, 6.6323],
  'Geneva':      [46.2044, 6.1432],
  'Nyon':        [46.3833, 6.2396],
  'Morges':      [46.5109, 6.4981],
  'Montreux':    [46.4312, 6.9107],
  'Bern':        [46.9480, 7.4474],
  'Zurich':      [47.3769, 8.5417],
  'Basel':       [47.5596, 7.5886],
  'Fribourg':    [46.8065, 7.1620],
  'Neuchâtel':   [46.9900, 6.9293],
  'Sion':        [46.2270, 7.3586],
  'Yverdon':     [46.7785, 6.6410],
  'Lucerne':     [47.0502, 8.3093],
  'Interlaken':  [46.6863, 7.8632],
  'Lyon':        [45.7640, 4.8357],
  'Paris':       [48.8566, 2.3522],
  'Annecy':      [45.8992, 6.1294],
  'Strasbourg':  [48.5734, 7.7521],
  'Milan':       [45.4642, 9.1900],
  'Turin':       [45.0703, 7.6869],
};

/**
 * Haversine distance in km between two lat/lng points.
 * Accurate enough for routing — no external API needed.
 */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Distance between two cities in km.
 * Uses coordinates if available, otherwise estimates 150km.
 * Multiplies haversine by 1.3 to approximate road distance (roads aren't straight).
 */
function d(a: string, b: string): number {
  const ca = COORDS[norm(a)], cb = COORDS[norm(b)];
  if (!ca || !cb) return 150; // unknown city fallback
  return Math.round(haversine(ca[0], ca[1], cb[0], cb[1]) * 1.3); // ~1.3x for road vs straight line
}

/**
 * "On the way" check — pure geometry, no hardcoded corridors.
 *
 * City C is "on the way" from A to B if the detour A→C→B is
 * less than 30% longer than going A→B directly.
 *
 * Also checks that C is geographically between A and B (not behind A).
 */
function cityIsOnRoute(tripFrom: string, tripTo: string, city: string): boolean {
  const f = norm(tripFrom), t = norm(tripTo), c = norm(city);
  if (eq(f, c) || eq(t, c)) return false;

  const cf = COORDS[f], ct = COORDS[t], cc = COORDS[c];
  if (!cf || !ct || !cc) return false;

  const direct = haversine(cf[0], cf[1], ct[0], ct[1]);
  const leg1 = haversine(cf[0], cf[1], cc[0], cc[1]);
  const leg2 = haversine(cc[0], cc[1], ct[0], ct[1]);
  const detour = leg1 + leg2;

  // Max 30% detour
  if (detour > direct * 1.3) return false;

  // C must be "between" A and B — closer to both than A→B distance
  // (prevents matching cities that are on the opposite side)
  if (leg1 > direct || leg2 > direct) return false;

  return true;
}

// Size + pricing helpers
const SZ: Record<string, number> = { small: 1, medium: 2, large: 3 };
function fits(trip: string, pkg: string) { return (SZ[trip] || 1) >= (SZ[pkg] || 1); }

/** Check if a trip can serve a request based on type (package vs passenger) */
function tripMatchesType(trip: any, reqType: string, passengerCount: number): boolean {
  if (reqType === 'passenger') {
    return !!trip.accepts_passengers && (trip.available_seats || 0) >= Math.max(1, passengerCount);
  }
  // Package request — any trip can carry packages (unless it's passenger-only with no space)
  return true;
}

/** Price per seat for passenger requests */
function passengerPrice(km: number, seats: number, urg: string, carrierSet: number | null, rep: number): { fee: number; desc: string } {
  // Base price per seat
  let perSeat = carrierSet != null && carrierSet > 0 ? carrierSet
    : km < 50 ? 2
    : km < 200 ? 3 + ((km - 50) / 150) * 4
    : 7 + ((km - 200) / 300) * 8;
  perSeat = Math.round(perSeat * 10) / 10;

  const parts: string[] = [carrierSet ? `Carrier asks ${carrierSet} TON/seat` : `${km}km: ${perSeat} TON/seat`];

  // Seat multiplier: 1=1x, 2=1.8x, 3=2.5x, 4=3x
  const multiplier = seats === 1 ? 1 : seats === 2 ? 1.8 : seats === 3 ? 2.5 : 3;
  let fee = perSeat * multiplier;
  if (seats > 1) parts.push(`${seats} seats × ${multiplier}`);

  if (rep >= 4.8) { fee *= 1.1; parts.push('premium +10%'); }
  if (carrierSet == null) { fee *= 0.8; parts.push('exact-route -20%'); }

  return { fee: Math.round(fee * 100) / 100, desc: parts.join(', ') };
}

function price(km: number, size: string, urg: string, carrierSet: number | null, rep: number): { fee: number; desc: string } {
  let fee = carrierSet != null && carrierSet > 0 ? carrierSet
    : km < 50 ? 2.5 + (km / 50) * 1.5
    : km < 200 ? 4 + ((km - 50) / 150) * 6
    : 10 + ((km - 200) / 300) * 15;
  fee = Math.round(fee * 10) / 10;
  const parts: string[] = [carrierSet ? `Carrier asks ${carrierSet} TON` : `${km}km: base ${fee} TON`];
  if (size === 'large') { fee *= 1.3; parts.push('large +30%'); }
  else if (size === 'medium') { fee *= 1.1; parts.push('medium +10%'); }
  if (urg === 'urgent') { fee *= 1.5; parts.push('urgent 1.5x'); }
  if (rep >= 4.8) { fee *= 1.1; parts.push('premium carrier +10%'); }
  if (carrierSet == null) { fee *= 0.8; parts.push('exact-route -20%'); }
  return { fee: Math.round(fee * 100) / 100, desc: parts.join(', ') };
}

/**
 * Sub-route price: proportional share of the carrier's full trip price.
 * If carrier charges 8 TON for Geneva→Lyon (155km) and you only need
 * Geneva→ partway (say 100km), you pay (100/155)*8 = 5.16 TON.
 */
function subRoutePrice(fullKm: number, subKm: number, carrierPrice: number | null, size: string, urg: string, rep: number): { fee: number; desc: string } {
  const ratio = Math.min(1, subKm / Math.max(1, fullKm));
  if (carrierPrice != null && carrierPrice > 0) {
    let fee = Math.round(carrierPrice * ratio * 100) / 100;
    const parts = [`${Math.round(ratio * 100)}% of ${carrierPrice} TON (${subKm}km of ${fullKm}km)`];
    if (size === 'large') { fee *= 1.3; parts.push('large +30%'); }
    else if (size === 'medium') { fee *= 1.1; parts.push('medium +10%'); }
    if (urg === 'urgent') { fee *= 1.5; parts.push('urgent 1.5x'); }
    return { fee: Math.round(fee * 100) / 100, desc: parts.join(', ') };
  }
  // No carrier price set — use formula for the sub-distance
  return price(subKm, size, urg, null, rep);
}

// ═══════════════════════════════════════════════════════════════
// LLM MATCHING — The AI Agent
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `You are CarryTON's intelligent delivery matching and pricing agent. You operate a community delivery network where everyday travelers carry packages for others — like a CFF/SBB train search, but for cars and personal trips.

YOUR MATCHING STRATEGIES (use ALL of them):

1. DIRECT MATCH: Trip A→B exactly matches request A→B.

2. SUB-ROUTE ("on my way"): A carrier's route PASSES THROUGH the request's origin and/or destination. Three sub-cases:
   a) Same origin, drop-off on the way: Trip A→C, request A→B, B is between A and C.
   b) Same destination, pick-up on the way: Trip C→B, request A→B, A is between C and B.
   c) BOTH on the way: Trip X→Y, request A→B, where A and B are BOTH on the X→Y route. The carrier picks up at A and drops off at B without detour.
      Example: Carrier posts "Lausanne → Geneva". Request is "Nyon → Geneva". Nyon is ON THE A1 between Lausanne and Geneva. The carrier passes right through Nyon. One hop, not two.
      Example: Carrier posts "Lausanne → Lyon" (8 TON). Request is "Geneva → Lyon". Geneva is on the way. Price: proportional to Geneva→Lyon distance.
   Price = proportional share of full trip price based on distance ratio. Mark as "AI suggestion" — carrier needs to confirm the extra stop.

3. MULTI-HOP RELAY: No single trip covers the route, but Trip A→C + Trip C→B does. Chain them with a handoff at city C. Minimum 30-minute buffer between trips at the relay point.
   Example: Request "Lausanne → Lyon". Found: Alice "Lausanne → Geneva" + Marco "Geneva → Lyon". Combined route with handoff in Geneva.

4. SUB-ROUTE + RELAY COMBO: Combine strategies 2 and 3. A carrier going past your destination can be combined with another carrier for the remaining leg.

PRICING RULES:
- Short trip (<50km): 2-4 TON
- Medium trip (50-200km): 4-10 TON
- Long trip (>200km): 10-25 TON
- If carrier set a price: use proportional share for sub-routes
- Urgency 'urgent': 1.5x multiplier
- Large package: +30% premium
- Carrier reputation 4.8+: +10%
- Zero detour (exact route): -15-25% discount
- Sub-route suggestions: add negotiation_note explaining "This is an AI-suggested stop — {carrier_name} hasn't confirmed this yet. Price is proportional to distance."

BUNDLE DETECTION: If multiple open requests share the same route or sub-route, reduce per-requester fee by 15-30%.

RESPONSE FORMAT — return ONLY valid JSON:
{
  "matches": [
    {
      "hops": [{ "trip_id": 1, "carrier_id": 10, "carrier_name": "Alice", "from": "Lausanne", "to": "Geneva", "departure_time": "2026-03-22T09:00:00Z", "fee_ton": 3.5 }],
      "total_fee_ton": 3.5,
      "estimated_duration_hours": 1.5,
      "confidence": "high",
      "reasoning": "Explain the match and pricing logic.",
      "bundle_discount_applied": false,
      "negotiation_note": null
    }
  ],
  "no_match_reason": null
}`;

async function llmMatch(request: any, trips: any[], otherRequests: any[]): Promise<AIMatchResult | null> {
  const userPrompt = `ACTIVE CARRIER TRIPS:
${JSON.stringify(trips, null, 2)}

DELIVERY REQUEST TO MATCH:
- From: ${request.from_city}
- To: ${request.to_city}
- Deadline: ${request.deadline || 'flexible'}
- Package size: ${request.package_size}
- Budget: ${request.budget_ton ? request.budget_ton + ' TON' : 'open — you set the price'}
- Urgency: ${request.urgency}
- Is errand: ${request.is_errand ? 'yes' : 'no'}${request.errand_details ? ' — ' + request.errand_details : ''}

OTHER OPEN REQUESTS (for bundle detection):
${JSON.stringify(otherRequests, null, 2)}

IMPORTANT: Use ALL matching strategies — direct, sub-route, multi-hop relay, and combos. Think like a train routing engine: find every possible connection, even partial ones.`;

  try {
    const raw = await callLLM(SYSTEM_PROMPT, userPrompt);
    const result: AIMatchResult = JSON.parse(raw);
    if (!result.matches || !Array.isArray(result.matches)) return null;

    for (const m of result.matches) {
      if (!m.hops || !Array.isArray(m.hops) || m.hops.length === 0) continue;
      // Sanitize each hop — LLMs sometimes omit or mistype fields
      for (const h of m.hops) {
        if (typeof h.fee_ton !== 'number' || isNaN(h.fee_ton)) h.fee_ton = 0;
        if (typeof h.trip_id !== 'number') h.trip_id = 0;
        if (typeof h.carrier_id !== 'number') h.carrier_id = 0;
        if (!h.carrier_name) h.carrier_name = 'Carrier';
        if (!h.from) h.from = '';
        if (!h.to) h.to = '';
        if (!h.departure_time) h.departure_time = new Date().toISOString();
      }
      if (typeof m.total_fee_ton !== 'number' || isNaN(m.total_fee_ton)) {
        m.total_fee_ton = m.hops.reduce((s, h) => s + h.fee_ton, 0);
      }
      if (!m.estimated_duration_hours) m.estimated_duration_hours = m.hops.length * 2;
      if (!m.confidence) m.confidence = 'medium';
      if (!m.reasoning) m.reasoning = 'AI-matched route.';
      if (m.bundle_discount_applied === undefined) m.bundle_discount_applied = false;
      if (m.negotiation_note === undefined) m.negotiation_note = null;
    }
    result.matches = result.matches.filter(m => m.hops && m.hops.length > 0);
    return result;
  } catch (err) {
    console.warn('[matching] LLM failed, using algorithm:', (err as Error).message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// ALGORITHMIC FALLBACK — CFF-style connection search
// ═══════════════════════════════════════════════════════════════

function algorithmicMatch(request: any, trips: any[], otherReqs: any[]): AIMatchResult {
  const from = norm(request.from_city), to = norm(request.to_city);
  const sz = request.package_size || 'small', urg = request.urgency || 'normal';
  const reqType = request.type || 'package';
  const passengerCount = request.passenger_count || (reqType === 'passenger' ? 1 : 0);
  const opts: AIRouteOption[] = [];

  /** Get price based on request type */
  function getPrice(km: number, trip: any) {
    if (reqType === 'passenger') {
      return passengerPrice(km, passengerCount, urg, trip.price_ton, trip.carrier_reputation);
    }
    return price(km, sz, urg, trip.price_ton, trip.carrier_reputation);
  }

  /** Check if trip can serve this request */
  function canServe(trip: any) {
    if (!tripMatchesType(trip, reqType, passengerCount)) return false;
    if (reqType === 'package' && !fits(trip.max_size, sz)) return false;
    return true;
  }

  // ── Strategy 1: Direct match (A→B = A→B) ──
  for (const t of trips) {
    if (!eq(t.from_city, from) || !eq(t.to_city, to) || !canServe(t)) continue;
    const km = d(from, to);
    const p = getPrice(km, t);
    opts.push({
      hops: [{ trip_id: t.id, carrier_id: t.carrier_id, carrier_name: t.carrier_name, from: t.from_city, to: t.to_city, departure_time: t.departure_time, fee_ton: p.fee }],
      total_fee_ton: p.fee,
      estimated_duration_hours: Math.max(1, Math.round(km / 80 * 10) / 10),
      confidence: 'high',
      reasoning: `Direct match. ${t.carrier_name} travels ${t.from_city} → ${t.to_city}. ${p.desc}.`,
      bundle_discount_applied: false,
      negotiation_note: null,
    });
  }

  // ── Strategy 2: Sub-route ("you're on my way") ──
  // Carrier goes A→C, request is A→B, and B is on the way from A to C
  for (const t of trips) {
    if (!canServe(t)) continue;
    // Case 2a: Same departure, destination is on carrier's route
    // Request A→B, trip A→C where B is between A and C
    if (eq(t.from_city, from) && !eq(t.to_city, to) && cityIsOnRoute(t.from_city, t.to_city, to)) {
      const fullKm = d(t.from_city, t.to_city);
      const subKm = d(from, to);
      const p = subRoutePrice(fullKm, subKm, t.price_ton, sz, urg, t.carrier_reputation);
      opts.push({
        hops: [{ trip_id: t.id, carrier_id: t.carrier_id, carrier_name: t.carrier_name, from: t.from_city, to: norm(to), departure_time: t.departure_time, fee_ton: p.fee }],
        total_fee_ton: p.fee,
        estimated_duration_hours: Math.max(0.5, Math.round(subKm / 80 * 10) / 10),
        confidence: 'medium',
        reasoning: `Sub-route: ${t.carrier_name} travels ${t.from_city} → ${t.to_city}, and ${norm(to)} is on the way. Drop-off adds minimal detour. ${p.desc}.`,
        bundle_discount_applied: false,
        negotiation_note: `AI suggestion — ${t.carrier_name} hasn't confirmed this stop yet. ${norm(to)} is on their ${t.from_city} → ${t.to_city} route. Price is proportional to distance.`,
      });
    }
    // Case 2b: Same destination, origin is on carrier's route
    // Request A→B, trip C→B where A is between C and B
    if (!eq(t.from_city, from) && eq(t.to_city, to) && cityIsOnRoute(t.from_city, t.to_city, from)) {
      const fullKm = d(t.from_city, t.to_city);
      const subKm = d(from, to);
      const p = subRoutePrice(fullKm, subKm, t.price_ton, sz, urg, t.carrier_reputation);
      opts.push({
        hops: [{ trip_id: t.id, carrier_id: t.carrier_id, carrier_name: t.carrier_name, from: norm(from), to: t.to_city, departure_time: t.departure_time, fee_ton: p.fee }],
        total_fee_ton: p.fee,
        estimated_duration_hours: Math.max(0.5, Math.round(subKm / 80 * 10) / 10),
        confidence: 'medium',
        reasoning: `Sub-route: ${t.carrier_name} travels ${t.from_city} → ${t.to_city}, passing through ${norm(from)}. Pick-up on the way. ${p.desc}.`,
        bundle_discount_applied: false,
        negotiation_note: `AI suggestion — ${t.carrier_name} passes through ${norm(from)} on their route. They haven't confirmed this pick-up point yet.`,
      });
    }
    // Case 2c: BOTH origin and destination are on carrier's route (the key "Nyon→Geneva" case)
    // Request A→B, trip X→Y where A is on the way AND B is on the way (or B=Y), and A comes before B
    // e.g. Request Nyon→Geneva, trip Lausanne→Geneva: Nyon is between Lausanne and Geneva
    if (!eq(t.from_city, from) && !eq(t.to_city, from) && !eq(t.from_city, to) &&
        cityIsOnRoute(t.from_city, t.to_city, from) &&
        (eq(t.to_city, to) || cityIsOnRoute(t.from_city, t.to_city, to))) {
      // Verify ordering: from should be closer to trip origin than to
      const distOriginToPickup = d(t.from_city, from);
      const distOriginToDropoff = eq(t.to_city, to) ? d(t.from_city, t.to_city) : d(t.from_city, to);
      if (distOriginToPickup < distOriginToDropoff) {
        const subKm = d(from, to);
        const fullKm = d(t.from_city, t.to_city);
        const p = subRoutePrice(fullKm, subKm, t.price_ton, sz, urg, t.carrier_reputation);
        const dropCity = eq(t.to_city, to) ? t.to_city : norm(to);
        opts.push({
          hops: [{ trip_id: t.id, carrier_id: t.carrier_id, carrier_name: t.carrier_name, from: norm(from), to: dropCity, departure_time: t.departure_time, fee_ton: p.fee }],
          total_fee_ton: p.fee,
          estimated_duration_hours: Math.max(0.5, Math.round(subKm / 80 * 10) / 10),
          confidence: 'medium',
          reasoning: `On-the-way: ${t.carrier_name} travels ${t.from_city} → ${t.to_city} and passes through both ${norm(from)} and ${dropCity}. Pick up at ${norm(from)}, drop off at ${dropCity} — zero detour. ${p.desc}.`,
          bundle_discount_applied: false,
          negotiation_note: `AI suggestion — ${t.carrier_name} drives right through ${norm(from)} on the way to ${t.to_city}. Pick-up and drop-off are both on their route. Needs carrier confirmation.`,
        });
      }
    }
  }

  // ── Strategy 3: Multi-hop relay (A→C + C→B) ──
  for (const l1 of trips) {
    if (!eq(l1.from_city, from) || !canServe(l1)) continue;
    const relay = norm(l1.to_city);
    if (eq(relay, to)) continue;
    for (const l2 of trips) {
      if (l1.id === l2.id || !eq(l2.from_city, relay) || !eq(l2.to_city, to) || !canServe(l2)) continue;
      // 90-min buffer between hops (1h trip + 30min handoff)
      if (new Date(l2.departure_time).getTime() < new Date(l1.departure_time).getTime() + 5400000) continue;
      const d1 = d(from, relay), d2 = d(relay, to);
      const p1 = getPrice(d1, l1);
      const p2 = getPrice(d2, l2);
      const total = Math.round((p1.fee + p2.fee) * 100) / 100;
      const label = reqType === 'passenger' ? 'passenger relay' : 'package relay';
      opts.push({
        hops: [
          { trip_id: l1.id, carrier_id: l1.carrier_id, carrier_name: l1.carrier_name, from: l1.from_city, to: l1.to_city, departure_time: l1.departure_time, fee_ton: p1.fee },
          { trip_id: l2.id, carrier_id: l2.carrier_id, carrier_name: l2.carrier_name, from: l2.from_city, to: l2.to_city, departure_time: l2.departure_time, fee_ton: p2.fee },
        ],
        total_fee_ton: total,
        estimated_duration_hours: Math.max(2, Math.round((d1 + d2) / 80 * 10) / 10),
        confidence: 'medium',
        reasoning: `Multi-hop ${label} via ${relay}. ${l1.carrier_name} (${p1.desc}) → handoff → ${l2.carrier_name} (${p2.desc}).`,
        bundle_discount_applied: false,
        negotiation_note: `Connection through ${relay}. Both carriers already heading this way.`,
      });
    }
  }

  // ── Strategy 4: Sub-route on first leg + exact second leg ──
  // Carrier1 goes A→X (passing through C), Carrier2 goes C→B
  for (const l1 of trips) {
    if (!eq(l1.from_city, from) || !canServe(l1)) continue;
    // l1 goes from→somewhere. Check if any city is a useful relay.
    for (const l2 of trips) {
      if (l1.id === l2.id || !eq(l2.to_city, to) || !canServe(l2)) continue;
      const relay = norm(l2.from_city);
      if (eq(relay, from) || eq(relay, to) || eq(relay, norm(l1.to_city))) continue;
      // Is relay on l1's route?
      if (!cityIsOnRoute(l1.from_city, l1.to_city, relay)) continue;
      if (new Date(l2.departure_time).getTime() < new Date(l1.departure_time).getTime() + 5400000) continue;
      const d1 = d(from, relay), d2 = d(relay, to);
      const fullKm1 = d(l1.from_city, l1.to_city);
      const p1 = subRoutePrice(fullKm1, d1, l1.price_ton, sz, urg, l1.carrier_reputation);
      const p2 = getPrice(d2, l2);
      const total = Math.round((p1.fee + p2.fee) * 100) / 100;
      opts.push({
        hops: [
          { trip_id: l1.id, carrier_id: l1.carrier_id, carrier_name: l1.carrier_name, from: l1.from_city, to: relay, departure_time: l1.departure_time, fee_ton: p1.fee },
          { trip_id: l2.id, carrier_id: l2.carrier_id, carrier_name: l2.carrier_name, from: l2.from_city, to: l2.to_city, departure_time: l2.departure_time, fee_ton: p2.fee },
        ],
        total_fee_ton: total,
        estimated_duration_hours: Math.max(2, Math.round((d1 + d2) / 80 * 10) / 10),
        confidence: 'low',
        reasoning: `Smart connection: ${l1.carrier_name} (${l1.from_city} → ${l1.to_city}) drops off at ${relay}, then ${l2.carrier_name} continues to ${to}. ${p1.desc} + ${p2.desc}.`,
        bundle_discount_applied: false,
        negotiation_note: `AI-suggested route — ${l1.carrier_name} would drop off at ${relay} (on their way to ${l1.to_city}). Needs carrier confirmation.`,
      });
    }
  }

  // ── Bundle detection ──
  const samePath = otherReqs.filter((r: any) => eq(r.from_city, from) && eq(r.to_city, to));
  if (samePath.length > 0) {
    for (const opt of opts) {
      const disc = opt.total_fee_ton * 0.2;
      opt.total_fee_ton = Math.round((opt.total_fee_ton - disc) * 100) / 100;
      opt.hops[opt.hops.length - 1].fee_ton = Math.round((opt.hops[opt.hops.length - 1].fee_ton - disc) * 100) / 100;
      opt.bundle_discount_applied = true;
      opt.reasoning += ' Bundle discount: another request shares this route — save 20%.';
    }
  }

  // ── Deduplicate (same trip IDs in same order) ──
  const seen = new Set<string>();
  const deduped = opts.filter(opt => {
    const key = opt.hops.map(h => `${h.trip_id}:${h.from}→${h.to}`).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Sort: confidence → price ──
  const conf: Record<string, number> = { high: 0, medium: 1, low: 2 };
  deduped.sort((a, b) => (conf[a.confidence] || 2) - (conf[b.confidence] || 2) || a.total_fee_ton - b.total_fee_ton);

  if (deduped.length === 0) {
    const nearby = trips.filter((t: any) => eq(t.from_city, from) || eq(t.to_city, to))
      .map((t: any) => `${t.from_city} → ${t.to_city}`);
    const hint = nearby.length > 0 ? ` Nearby routes: ${[...new Set(nearby)].slice(0, 4).join(', ')}.` : '';
    return { matches: [], no_match_reason: `No carriers traveling ${request.from_city} → ${request.to_city} right now.${hint} Try again tomorrow morning — weekdays are busier.` };
  }

  return { matches: deduped.slice(0, 5), no_match_reason: null };
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

export async function findMatches(requestId: number): Promise<AIMatchResult> {
  try {
    const request = db.prepare(`
      SELECT r.*, u.display_name as requester_name
      FROM requests r JOIN users u ON r.requester_id = u.id WHERE r.id = ?
    `).get(requestId) as any;
    if (!request) return { matches: [], no_match_reason: 'Request not found.' };

    const trips = db.prepare(`
      SELECT t.*, u.display_name as carrier_name, u.reputation as carrier_reputation
      FROM trips t JOIN users u ON t.carrier_id = u.id
      WHERE t.status = 'active' ORDER BY t.departure_time ASC
    `).all() as any[];

    if (trips.length === 0) {
      return { matches: [], no_match_reason: 'No active carrier trips right now. Try again later.' };
    }

    const otherReqs = db.prepare(`SELECT * FROM requests WHERE status = 'open' AND id != ?`).all(requestId) as any[];

    // Try LLM first
    const llmResult = await llmMatch(request, trips, otherReqs);
    if (llmResult && (llmResult.matches.length > 0 || llmResult.no_match_reason)) {
      console.log(`[matching] LLM: ${llmResult.matches.length} match(es)`);
      return llmResult;
    }

    // Fallback to algorithm
    console.log('[matching] Algorithmic fallback');
    return algorithmicMatch(request, trips, otherReqs);

  } catch (err) {
    console.error('[matching] Fatal:', err);
    return { matches: [], no_match_reason: 'Matching service temporarily unavailable.' };
  }
}
