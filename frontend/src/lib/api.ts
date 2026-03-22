import type {
  Trip, DeliveryRequest, Match, MatchHop, AvatarState,
  CreateTripRequest, CreateDeliveryRequest, MatchResponse, ReviewRequest, User,
} from '../../../shared/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = {
  async get(path: string) {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },

  async post(path: string, body: unknown) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },

  async patch(path: string, body: unknown) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  },
};

export default api;

export async function getTrips(params?: Record<string, string>): Promise<Trip[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const data = await api.get(`/trips${qs}`);
  return data.trips;
}

export async function getRequests(params?: Record<string, string>): Promise<DeliveryRequest[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const data = await api.get(`/requests${qs}`);
  return data.requests;
}

export async function getRequest(requestId: number): Promise<DeliveryRequest> {
  const data = await api.get(`/requests/${requestId}`);
  return data.request;
}

export async function createTrip(data: CreateTripRequest & { carrier_id: number }): Promise<Trip> {
  const res = await api.post('/trips', data);
  return res.trip;
}

export async function createRequest(data: CreateDeliveryRequest & { requester_id: number }): Promise<DeliveryRequest> {
  const res = await api.post('/requests', data);
  return res.request;
}

export async function findMatches(requestId: number): Promise<MatchResponse> {
  return api.post('/matches/find', { request_id: requestId });
}

export async function acceptMatch(matchId: number, userId: number): Promise<Match> {
  const res = await api.post(`/matches/${matchId}/accept`, { user_id: userId });
  return res.match;
}

export async function getMatch(matchId: number): Promise<{ match: Match; hops: MatchHop[] }> {
  return api.get(`/matches/${matchId}`);
}

export async function getTonPrice(): Promise<{ ton_usd: number; ton_eur: number; ton_chf: number }> {
  return api.get('/price/ton');
}

export async function getUser(telegramId: string): Promise<User> {
  try {
    const data = await api.get(`/users/${telegramId}`);
    return data.user;
  } catch {
    // User doesn't exist — try to create from Telegram data, or fall back to demo user (Bob)
    try {
      const res = await api.post('/users', {
        telegram_id: telegramId,
        username: 'user_' + telegramId,
        display_name: 'User',
      });
      return res.user;
    } catch {
      // Last resort: return demo user Bob so the app is always usable
      const data = await api.get('/users/tg_bob');
      return data.user;
    }
  }
}

export async function getUserAvatar(userId: number): Promise<{ avatar: AvatarState; next_level_xp: number; progress_percent: number }> {
  return api.get(`/users/${userId}/avatar`);
}

export async function submitReview(data: ReviewRequest): Promise<{ review: unknown; new_badges: string[] }> {
  return api.post('/reviews', data);
}

export async function submitTip(data: { match_id: number; tipper_id: number; carrier_id: number; amount_ton: number; ai_suggested?: boolean }): Promise<{ tip: unknown; new_badges: string[] }> {
  return api.post('/tips', data);
}

export async function getTipSuggestion(matchId: number): Promise<{ suggested_amount: number; reasoning: string; carrier_names: string }> {
  return api.post('/tips/suggest', { match_id: matchId });
}

export async function getMatchTip(matchId: number): Promise<{ tip: unknown | null }> {
  return api.get(`/tips/match/${matchId}`);
}

export interface VoiceParseResult {
  from_city: string | null;
  to_city: string | null;
  package_size: 'small' | 'medium' | 'large' | null;
  urgency: 'normal' | 'urgent' | null;
  deadline: string | null;
  package_desc: string | null;
  budget_ton: number | null;
  is_errand: boolean;
  errand_details: string | null;
  confidence: 'high' | 'medium' | 'low';
  clarification: string | null;
}

export async function parseVoice(transcript: string): Promise<VoiceParseResult> {
  return api.post('/voice/parse', { transcript });
}
