'use client';
import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/providers/AppProvider';
import { findMatches, acceptMatch, getRequest } from '@/lib/api';
import type { AIRouteOption, PriceDisplay, DeliveryRequest } from '../../../../../shared/types';
import { MatchCard } from '@/components/MatchCard';
import { useToast } from '@/components/Toast';

const LOADING_MESSAGES = [
  'Checking active carriers…',
  'Analyzing multi-hop routes…',
  'Calculating optimal pricing…',
  'Almost there…',
];

function LoadingState() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--blue-light)' }}>
        <svg className="anim-spin" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>
      <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-1)' }}>
        Finding the best route…
      </p>
      <p className="text-sm animate-pulse transition-all min-h-5" style={{ color: 'var(--text-2)' }}>
        {LOADING_MESSAGES[msgIndex]}
      </p>
    </div>
  );
}

function RequestSummary({ request }: { request: DeliveryRequest }) {
  return (
    <div className="card p-4 mb-4" style={{ background: 'var(--surface-3)' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Your request</p>
      <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-1)' }}>
        {request.from_city} → {request.to_city}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
          {request.package_size}
        </span>
        {request.budget_ton != null && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Budget: {request.budget_ton} BXC
          </span>
        )}
        {request.urgency === 'urgent' && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            ⚡ Urgent
          </span>
        )}
        {request.is_errand && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
            🏃 Errand
          </span>
        )}
      </div>
      {request.is_errand && request.errand_details && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {request.errand_details}
        </p>
      )}
    </div>
  );
}

function NoMatchState({
  reason,
  onModify,
}: {
  reason: string | null;
  onModify: () => void;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-3)' }}>
        <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeLinecap="round">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
        </svg>
      </div>
      <p className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
        No carriers on this route right now
      </p>
      {reason && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs mx-auto">
          {reason}
        </p>
      )}
      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <button className="bg-[#2AABEE] text-white rounded-xl px-6 py-3 text-sm font-semibold">
          Notify me when a carrier posts
        </button>
        <button
          onClick={onModify}
          className="border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl px-6 py-3 text-sm font-semibold"
        >
          Modify your request
        </button>
      </div>
    </div>
  );
}

export default function MatchResultsPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = use(params);
  const router = useRouter();
  const { user } = useApp();

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [matches, setMatches] = useState<(AIRouteOption & { match_id?: number })[]>([]);
  const [prices, setPrices] = useState<PriceDisplay[]>([]);
  const [noMatchReason, setNoMatchReason] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const { showToast } = useToast();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const reqId = parseInt(requestId);

    // Fetch request details and match results in parallel
    Promise.all([
      getRequest(reqId).catch(() => null),
      findMatches(reqId),
    ]).then(([req, result]) => {
      if (req) setRequest(req);
      setMatches(result.matches || []);
      setPrices(result.prices || []);
      setNoMatchReason(result.no_match_reason || null);
    }).catch(() => {
      setNoMatchReason('Something went wrong. Please try again.');
    }).finally(() => {
      setLoading(false);
    });
  }, [requestId]);

  async function handleAccept(matchId: number) {
    if (!user) return;
    setAccepting(true);
    try {
      await acceptMatch(matchId, Number(user.id));
      showToast('Match accepted!', 'success');
      setTimeout(() => router.push(`/job/${matchId}`), 1200);
    } catch (err) {
      // If the accept API itself succeeded but wallet/payment failed, treat as simulated
      // Otherwise show a real error
      try {
        const checkRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/matches/${matchId}`);
        const checkData = await checkRes.json();
        if (checkData.match?.status === 'accepted') {
          showToast('Payment simulated — match accepted!', 'info');
          setTimeout(() => router.push(`/job/${matchId}`), 1200);
          return;
        }
      } catch { /* fall through to error */ }
      showToast('Failed to accept match. Please try again.', 'error');
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="min-h-screen anim-in" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-colors"
          style={{ color: 'var(--text-2)' }}
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Match results</h1>
      </div>

      <div className="px-4 py-4 pb-24">
        {/* Request summary */}
        {request && <RequestSummary request={request} />}

        {loading ? (
          <LoadingState />
        ) : matches.length === 0 ? (
          <NoMatchState
            reason={noMatchReason}
            onModify={() => router.push('/request/new')}
          />
        ) : (
          <>
            {/* Subheader */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              🤖 AI found <span className="font-semibold text-gray-900 dark:text-white">{matches.length} route{matches.length !== 1 ? 's' : ''}</span>
              {' '}from active trips
            </p>

            {/* Match cards */}
            <div className="flex flex-col gap-4">
              {matches.map((match, i) => (
                <MatchCard
                  key={match.match_id ?? i}
                  match={match}
                  price={prices[i]}
                  index={i}
                  onAccept={handleAccept}
                  accepting={accepting}
                />
              ))}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
