'use client';
import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/providers/AppProvider';
import { getMatch, submitReview, submitTip, getTipSuggestion } from '@/lib/api';
import type { Match, MatchHop } from '../../../../../shared/types';
import { PriceTag } from '@/components/PriceTag';
import { useToast } from '@/components/Toast';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ---- Status helpers ----
function statusBadge(status: Match['status']) {
  switch (status) {
    case 'accepted':    return { label: 'Accepted',    cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'in_transit':  return { label: 'In transit',  cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'delivered':   return { label: 'Delivered',   cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
    case 'confirmed':   return { label: 'Confirmed ✓', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
    default:            return { label: status,        cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
  }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ---- Countdown timer ----
function useCountdown(targetIso: string) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    function tick() {
      const target = new Date(targetIso).getTime() + 24 * 3600 * 1000;
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return remaining;
}

// ---- Step dot ----
function StepDot({ state }: { state: 'done' | 'active' | 'pending' }) {
  if (state === 'done') return (
    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 z-10">
      <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  );
  if (state === 'active') return (
    <div className="w-7 h-7 rounded-full bg-[#2AABEE] flex items-center justify-center flex-shrink-0 z-10 relative">
      <div className="absolute w-full h-full rounded-full bg-[#2AABEE] animate-ping opacity-40" />
      <div className="w-3 h-3 rounded-full bg-white" />
    </div>
  );
  return <div className="w-7 h-7 rounded-full border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 z-10" />;
}

// ---- Timeline step ----
interface TimelineStepProps {
  state: 'done' | 'active' | 'pending';
  title: string;
  detail?: string;
  timestamp?: string;
  isLast: boolean;
}

function TimelineStep({ state, title, detail, timestamp, isLast }: TimelineStepProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <StepDot state={state} />
        {!isLast && (
          <div className={`w-0.5 flex-1 mt-1 min-h-8 ${state === 'done' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
        )}
      </div>
      <div className="pb-6 min-w-0 flex-1">
        <p className={`text-sm font-semibold ${state === 'pending' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}`}>
          {title}
        </p>
        {detail && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{detail}</p>}
        {timestamp && <p className="text-xs text-gray-400 mt-0.5">{timestamp}</p>}
      </div>
    </div>
  );
}

// ---- Review prompt ----
const REVIEW_TAGS = ['Fast', 'Friendly', 'Careful', 'Great communication', 'Professional'];

interface ReviewPromptProps {
  matchId: number;
  revieweeId: number;
  revieweeName: string;
  userId: number;
  onDone: (badges: string[]) => void;
}

function ReviewPrompt({ matchId, revieweeId, revieweeName, userId, onDone }: ReviewPromptProps) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  async function handleSubmit() {
    if (rating === 0) return;
    setLoading(true);
    try {
      const res = await submitReview({ match_id: matchId, reviewer_id: userId, reviewee_id: revieweeId, rating, tags, comment: comment || undefined });
      onDone(res.new_badges || []);
    } catch {
      onDone([]);
    }
  }

  return (
    <div className="card p-4 mt-4">
      <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>
        How was your experience with {revieweeName}?
      </p>

      {/* Star rating */}
      <div className="flex gap-2 mb-4">
        {[1,2,3,4,5].map((s) => (
          <button key={s} onClick={() => setRating(s)} className="text-2xl transition-transform active:scale-95">
            {s <= rating ? '★' : '☆'}
          </button>
        ))}
      </div>

      {/* Quick tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {REVIEW_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              tags.includes(tag)
                ? 'bg-[#2AABEE] border-[#2AABEE] text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
        rows={2}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2AABEE] resize-none mb-3"
      />

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || loading}
        className="w-full bg-[#2AABEE] text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50 active:scale-[0.98]"
      >
        {loading ? 'Submitting…' : 'Submit review'}
      </button>
    </div>
  );
}

// ---- Tip prompt ----
const TIP_PRESETS = [1, 2, 5];

interface TipPromptProps {
  matchId: number;
  carrierId: number;
  carrierName: string;
  userId: number;
  deliveryFee: number;
  onDone: (badges: string[]) => void;
}

function TipPrompt({ matchId, carrierId, carrierName, userId, deliveryFee, onDone }: TipPromptProps) {
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<{ amount: number; reasoning: string } | null>(null);
  const [skipped, setSkipped] = useState(false);
  const { showToast } = useToast();

  const selectedAmount = amount ?? (custom ? parseFloat(custom) : 0);

  async function handleAiSuggest() {
    setSuggesting(true);
    try {
      const res = await getTipSuggestion(matchId);
      setSuggestion({ amount: res.suggested_amount, reasoning: res.reasoning });
      setAmount(res.suggested_amount);
      setCustom('');
    } catch {
      showToast('Could not get suggestion', 'error');
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSubmit() {
    if (selectedAmount <= 0) return;
    setLoading(true);
    try {
      const res = await submitTip({
        match_id: matchId,
        tipper_id: userId,
        carrier_id: carrierId,
        amount_ton: selectedAmount,
        ai_suggested: suggestion?.amount === selectedAmount,
      });
      showToast(`Tipped ${selectedAmount} TON!`, 'success');
      onDone(res.new_badges || []);
    } catch (err) {
      showToast((err as Error).message || 'Tip failed', 'error');
      onDone([]);
    }
  }

  if (skipped) return null;

  return (
    <div className="card p-4 mt-4 anim-in">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
          Tip {carrierName}?
        </p>
        <button onClick={() => { setSkipped(true); onDone([]); }}
          className="text-xs font-medium cursor-pointer" style={{ color: 'var(--text-3)' }}>
          No thanks
        </button>
      </div>

      <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>
        Tips go 100% to the carrier — no platform fee.
      </p>

      {/* AI suggestion */}
      {suggestion && (
        <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-glow)' }}>
          <p className="text-xs" style={{ color: 'var(--text-1)' }}>{suggestion.reasoning}</p>
        </div>
      )}

      {/* Preset amounts */}
      <div className="flex gap-2 mb-3">
        {TIP_PRESETS.map((preset) => (
          <button key={preset}
            onClick={() => { setAmount(preset); setCustom(''); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-all"
            style={{
              background: amount === preset ? 'var(--accent)' : 'var(--surface-2)',
              color: amount === preset ? '#fff' : 'var(--text-1)',
              boxShadow: amount === preset ? '0 2px 8px rgba(42,171,238,.3)' : 'none',
            }}>
            {preset} TON
          </button>
        ))}
        {/* Custom input */}
        <div className="flex-1 relative">
          <input
            type="number"
            min="0.1"
            step="0.1"
            placeholder="Other"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setAmount(null); }}
            className="w-full py-2.5 px-3 rounded-xl text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-[#2AABEE]"
            style={{ background: 'var(--surface-2)', color: 'var(--text-1)', border: custom ? '2px solid var(--accent)' : '2px solid transparent' }}
          />
        </div>
      </div>

      {/* AI suggest button */}
      <button onClick={handleAiSuggest} disabled={suggesting}
        className="w-full py-2.5 rounded-xl text-xs font-bold mb-3 cursor-pointer transition-all"
        style={{ background: 'var(--violet-bg)', color: 'var(--violet)', border: '1px solid transparent' }}>
        {suggesting ? 'Thinking…' : '✨ Let AI suggest a fair tip'}
      </button>

      {/* Submit */}
      <button onClick={handleSubmit}
        disabled={selectedAmount <= 0 || loading}
        className="w-full py-3.5 rounded-xl text-sm font-bold cursor-pointer transition-all btn-accent disabled:opacity-40">
        {loading ? 'Sending…' : selectedAmount > 0 ? `Tip ${selectedAmount} TON` : 'Select an amount'}
      </button>
    </div>
  );
}

// ---- Main page ----
export default function JobTrackerPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId: matchIdStr } = use(params);
  const matchId = parseInt(matchIdStr);
  const router = useRouter();
  const { user } = useApp();

  const [match, setMatch] = useState<Match | null>(null);
  const [hops, setHops] = useState<MatchHop[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [celebration, setCelebration] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const [tipDone, setTipDone] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const { showToast } = useToast();
  const countdown = useCountdown(match?.created_at ?? new Date().toISOString());

  const fetchData = useCallback(async () => {
    try {
      const data = await getMatch(matchId);
      setMatch(data.match);
      setHops(data.hops);
    } catch {
      // keep stale data
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ---- Carrier actions ----
  async function handlePickup(hopOrder: number) {
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/matches/${matchId}/pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hop_order: hopOrder }),
      });
      if (res.ok) { await fetchData(); }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeliver(hopOrder: number) {
    setActionLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/matches/${matchId}/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hop_order: hopOrder }),
      });
      if (res.ok) { await fetchData(); }
    } finally {
      setActionLoading(false);
    }
  }

  // ---- Requester confirm ----
  async function handleConfirm() {
    if (!user) return;
    setConfirming(true);
    try {
      const res = await fetch(`${BASE_URL}/matches/${matchId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      if (res.ok) {
        await fetchData();
        setCelebration(`🎉 Payment released! Carrier earned ${match?.carrier_payout_ton ?? 0} TON`);
        setTimeout(() => setShowReview(true), 1500);
      }
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="anim-spin" style={{ color: 'var(--blue)' }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-2)' }}>Job not found.</p>
        <button onClick={() => router.push('/')} className="mt-4 text-sm font-semibold cursor-pointer" style={{ color: 'var(--blue)' }}>Go home</button>
      </div>
    );
  }

  const badge = statusBadge(match.status);
  const firstHop = hops[0];
  const lastHop = hops[hops.length - 1];
  const fromCity = firstHop?.from_city ?? '—';
  const toCity = lastHop?.to_city ?? '—';

  // Determine if current user is requester or carrier
  const isCarrier = user && hops.some((h) => h.carrier_id === (user.id as unknown as number));

  // ---- Build timeline steps ----
  type StepState = 'done' | 'active' | 'pending';

  function hopState(hop: MatchHop): { pickup: StepState; deliver: StepState } {
    if (hop.status === 'confirmed' || hop.status === 'delivered') {
      return { pickup: 'done', deliver: 'done' };
    }
    if (hop.status === 'picked_up') {
      return { pickup: 'done', deliver: 'active' };
    }
    // pending
    const matchActive = match!.status === 'accepted' || match!.status === 'in_transit';
    return { pickup: matchActive ? 'active' : 'pending', deliver: 'pending' };
  }

  const matchAcceptedDone = true; // always done once we have a match
  const allDelivered = hops.every((h) => h.status === 'delivered' || h.status === 'confirmed');
  const matchConfirmed = match.status === 'confirmed';

  return (
    <div className="min-h-screen anim-in" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full cursor-pointer"
          style={{ color: 'var(--text-2)' }}
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold flex-1" style={{ color: 'var(--text-1)' }}>Job tracker</h1>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4 pb-24">

        {/* Celebration banner */}
        {celebration && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl px-4 py-4 text-center">
            <p className="text-sm font-bold text-green-700 dark:text-green-400">{celebration}</p>
          </div>
        )}

        {/* New badges */}
        {newBadges.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl px-4 py-3 text-center">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-1">🏆 New badge{newBadges.length > 1 ? 's' : ''} earned!</p>
            <div className="flex gap-2 flex-wrap justify-center">
              {newBadges.map((b) => (
                <span key={b} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full">{b}</span>
              ))}
            </div>
          </div>
        )}

        {/* Delivery summary card */}
        <div className="card p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Active delivery</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            {fromCity} → {toCity}
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total fee</span>
            <PriceTag amount={match.total_fee_ton} size="md" />
          </div>
        </div>

        {/* Timeline */}
        <div className="card p-4">
          <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-1)' }}>Delivery timeline</p>

          {/* Step 1: Match accepted */}
          <TimelineStep
            state="done"
            title="Match accepted"
            detail={`Escrow funded: ${match.total_fee_ton} TON`}
            timestamp={fmtDate(match.created_at)}
            isLast={false}
          />

          {/* Steps per hop */}
          {hops.map((hop, i) => {
            const { pickup, deliver } = hopState(hop);
            const isLastHop = i === hops.length - 1;
            return (
              <div key={hop.id}>
                <TimelineStep
                  state={pickup}
                  title={`Picked up by ${hop.carrier_name}`}
                  detail={`Hop ${hop.hop_order}: ${hop.from_city} → ${hop.to_city}`}
                  timestamp={pickup === 'done' ? fmt(hop.departure_time) : undefined}
                  isLast={false}
                />
                <TimelineStep
                  state={deliver}
                  title={isLastHop ? `Delivered by ${hop.carrier_name}` : `Handed off at ${hop.to_city}`}
                  detail={isLastHop ? undefined : 'Relay handoff point'}
                  isLast={false}
                />
              </div>
            );
          })}

          {/* Step: Delivered */}
          <TimelineStep
            state={allDelivered ? 'done' : 'pending'}
            title="Delivered"
            detail={allDelivered ? 'Package reached destination' : 'Waiting for delivery'}
            isLast={false}
          />

          {/* Step: Confirmed & paid */}
          <TimelineStep
            state={matchConfirmed ? 'done' : 'pending'}
            title="Confirmed & paid"
            detail={matchConfirmed ? `Payment released to carrier(s)` : 'Waiting for requester confirmation'}
            isLast={true}
          />
        </div>

        {/* AI reasoning */}
        {match.ai_reasoning && (
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl px-4 py-3">
            <p className="text-xs text-blue-700 dark:text-blue-400 italic">{match.ai_reasoning}</p>
          </div>
        )}

        {/* Carrier action buttons */}
        {isCarrier && hops.map((hop) => {
          const myHop = hop.carrier_id === (user?.id as unknown as number);
          if (!myHop) return null;
          if (hop.status === 'pending') return (
            <button
              key={hop.id}
              onClick={() => handlePickup(hop.hop_order)}
              disabled={actionLoading}
              className="w-full bg-[#2AABEE] text-white rounded-2xl py-4 text-sm font-bold disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {actionLoading ? 'Updating…' : `Mark as picked up 📦`}
            </button>
          );
          if (hop.status === 'picked_up') return (
            <button
              key={hop.id}
              onClick={() => handleDeliver(hop.hop_order)}
              disabled={actionLoading}
              className="w-full bg-green-500 text-white rounded-2xl py-4 text-sm font-bold disabled:opacity-60 active:scale-[0.98] transition-transform"
            >
              {actionLoading ? 'Updating…' : `Mark as delivered ✅`}
            </button>
          );
          return null;
        })}

        {/* Requester confirm button */}
        {!isCarrier && match.status === 'delivered' && !matchConfirmed && (
          <button
            onClick={handleConfirm}
            disabled={confirming}
            className="w-full bg-green-500 text-white rounded-2xl py-4 text-base font-bold disabled:opacity-60 active:scale-[0.98] transition-transform shadow-sm"
          >
            {confirming ? 'Processing…' : 'Confirm delivery & release payment ✅'}
          </button>
        )}

        {/* Review prompt */}
        {showReview && !reviewDone && hops[0] && user && (
          <ReviewPrompt
            matchId={matchId}
            revieweeId={hops[0].carrier_id}
            revieweeName={hops[0].carrier_name ?? 'Carrier'}
            userId={user.id as unknown as number}
            onDone={(badges) => {
              setNewBadges(prev => [...prev, ...badges]);
              setReviewDone(true);
              setShowTip(true);
            }}
          />
        )}

        {/* Tip prompt — appears after review */}
        {showTip && !tipDone && hops[0] && user && (
          <TipPrompt
            matchId={matchId}
            carrierId={hops[0].carrier_id}
            carrierName={hops[0].carrier_name ?? 'Carrier'}
            userId={user.id as unknown as number}
            deliveryFee={match.total_fee_ton}
            onDone={(badges) => {
              setNewBadges(prev => [...prev, ...badges]);
              setTipDone(true);
            }}
          />
        )}

        {/* Escrow info card */}
        <div className="card p-4">
          <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-1)' }}>Escrow status</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Locked amount</span>
              <PriceTag amount={match.total_fee_ton} size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Contract</span>
              <span className="text-xs font-mono text-gray-700 dark:text-gray-300">
                {match.escrow_address
                  ? `${match.escrow_address.slice(0, 8)}…${match.escrow_address.slice(-6)}`
                  : 'Mock escrow'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Auto-refund in</span>
              <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{countdown}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
