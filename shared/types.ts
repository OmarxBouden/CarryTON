// ===== DATABASE ENTITY TYPES =====

export interface User {
  id: number;
  telegram_id: string;
  username: string | null;
  display_name: string | null;
  wallet_address: string | null;
  avatar_id: string | null;   // 'fox' | 'bear' | 'falcon' | 'turtle' | 'cat' | 'goat'
  reputation: number;        // 1.0 - 5.0
  total_trips: number;
  total_deliveries: number;
  xp: number;                // experience points for avatar evolution
  created_at: string;
}

export const ANIMAL_AVATARS = [
  { id: 'fox',    name: 'Swift Fox',      desc: 'Fast local deliveries',       color: '#F97316', bg: '#FFF7ED' },
  { id: 'bear',   name: 'Pack Bear',      desc: 'Heavy & large packages',      color: '#8B5CF6', bg: '#F5F3FF' },
  { id: 'falcon', name: 'Relay Falcon',   desc: 'Multi-hop specialist',        color: '#2AABEE', bg: '#E8F7FE' },
  { id: 'turtle', name: 'Road Turtle',    desc: 'Reliable, always arrives',    color: '#22C55E', bg: '#F0FDF4' },
  { id: 'cat',    name: 'Shadow Cat',     desc: 'Late-night deliveries',       color: '#6366F1', bg: '#EEF2FF' },
  { id: 'goat',   name: 'Mountain Goat',  desc: 'Hard-to-reach routes',        color: '#EC4899', bg: '#FDF2F8' },
] as const;

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
  accepts_passengers: boolean;
  available_seats: number;
  status: 'active' | 'matched' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
}

export interface DeliveryRequest {
  id: number;
  requester_id: number;
  requester_name?: string;
  type: 'package' | 'passenger';
  from_city: string;
  to_city: string;
  deadline: string | null;
  package_size: 'small' | 'medium' | 'large';
  package_desc: string | null;
  budget_ton: number | null;
  is_errand: boolean;
  errand_details: string | null;
  passenger_count: number;
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
  tip_given: 5,              // requester tips a carrier
  tip_received: 10,          // carrier receives a tip
} as const;

// ===== BADGE DEFINITIONS =====

export const BADGES: Badge[] = [
  { id: 'lightning-fast', name: 'Lightning fast', emoji: '\u26A1', description: 'Delivered 5+ packages ahead of schedule', tier: 'gold', category: 'speed' },
  { id: 'on-time-king', name: 'On-time royalty', emoji: '\uD83D\uDC51', description: '95%+ on-time delivery rate', tier: 'gold', category: 'reliability' },
  { id: 'relay-master', name: 'Relay master', emoji: '\uD83D\uDD17', description: 'Completed 3+ multi-hop relays', tier: 'silver', category: 'special' },
  { id: 'pack-mule', name: 'Pack mule', emoji: '\uD83E\uDECF', description: 'Carried 10+ large packages', tier: 'silver', category: 'volume' },
  { id: 'five-star-streak', name: 'Five-star streak', emoji: '\u2B50', description: '10 consecutive 5-star reviews', tier: 'gold', category: 'rating' },
  { id: 'first-carry', name: 'First carry', emoji: '\uD83D\uDCE6', description: 'Completed first delivery as carrier', tier: 'bronze', category: 'special' },
  { id: 'neighborhood-hero', name: 'Neighborhood hero', emoji: '\uD83C\uDFD8\uFE0F', description: '20+ deliveries in the same city pair', tier: 'gold', category: 'volume' },
  { id: 'night-owl', name: 'Night owl', emoji: '\uD83E\uDD89', description: '5+ deliveries completed after 10pm', tier: 'bronze', category: 'special' },
  { id: 'scenic-route', name: 'Scenic route specialist', emoji: '\uD83C\uDFD4\uFE0F', description: 'Consistently delivers \u2014 just... eventually', tier: 'bronze', category: 'speed' },
  { id: 'trusted-carrier', name: 'Trusted carrier', emoji: '\uD83D\uDEE1\uFE0F', description: '50+ completed deliveries with 4.5+ rating', tier: 'gold', category: 'reliability' },
  { id: 'generous-tipper', name: 'Generous tipper', emoji: '\uD83D\uDCB8', description: 'Tipped carriers 5+ times', tier: 'bronze', category: 'special' },
  { id: 'fan-favorite', name: 'Fan favorite', emoji: '\uD83C\uDF1F', description: 'Received 10+ tips from happy customers', tier: 'silver', category: 'rating' },
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
  negotiation_note: string | null;   // e.g. "Carrier asked 5 TON but this is a short detour \u2014 suggested 3.5"
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
  fiat_symbol: string;       // 'CHF', '\u20AC', '$'
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
  no_match_reason?: string | null;
}

export interface ReviewRequest {
  match_id: number;
  reviewer_id: number;
  reviewee_id: number;
  rating: number;             // 1-5
  tags: string[];             // ['fast', 'friendly', 'careful']
  comment?: string;
}
