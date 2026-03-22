'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TonConnectButton } from '@tonconnect/ui-react';
import { getTrips, getRequests, createRequest, findMatches, type VoiceParseResult } from '@/lib/api';
import type { Trip, DeliveryRequest } from '../../../shared/types';
import { Avatar } from '@/components/Avatar';
import { TripCardSkeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import { VoiceOverlay } from '@/components/VoiceOverlay';
import { useApp } from '@/providers/AppProvider';

/* ─── Animated Route Line ─── */
function RouteLine({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {/* Origin */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="relative flex h-[10px] w-[10px]">
          <span className="absolute inset-0 rounded-full anim-pulse" style={{ background: 'var(--accent)' }} />
          <span className="relative rounded-full h-[10px] w-[10px]" style={{ background: 'var(--accent)' }} />
        </span>
        <span className="t-title text-[14px]" style={{ color: 'var(--text-1)' }}>{from}</span>
      </div>

      {/* SVG route path */}
      <div className="flex-1 mx-2 min-w-[32px] h-[20px] relative">
        <svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-0">
          <path d="M0 10 Q25 2, 50 10 T100 10" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" opacity=".15" />
          <path d="M0 10 Q25 2, 50 10 T100 10" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" className="anim-dash" />
        </svg>
        {/* Animated dot traveling along path */}
        <div className="absolute top-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full"
          style={{ background: 'var(--accent)', left: '45%', boxShadow: '0 0 8px var(--accent)' }} />
      </div>

      {/* Destination */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="w-[10px] h-[10px] rounded-full border-[2.5px]" style={{ borderColor: 'var(--accent)' }} />
        <span className="t-title text-[14px]" style={{ color: 'var(--text-1)' }}>{to}</span>
      </div>
    </div>
  );
}

/* ─── Star rating ─── */
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[3px]">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width={10} height={10} viewBox="0 0 20 20"
          fill={i <= Math.round(rating) ? 'var(--amber)' : 'none'}
          stroke={i <= Math.round(rating) ? 'var(--amber)' : 'var(--text-3)'}
          strokeWidth={1.5}>
          <path d="M10 1.5l2.47 5.01L18 7.27l-4 3.9.95 5.53L10 14.27 5.05 16.7 6 11.17l-4-3.9 5.53-.76L10 1.5z"/>
        </svg>
      ))}
      <span className="text-[11px] font-semibold ml-1" style={{ color: 'var(--text-3)' }}>{rating.toFixed(1)}</span>
    </div>
  );
}

/* ─── Trip Card ─── */
function TripCard({ trip, onClick, index }: { trip: Trip; onClick: () => void; index: number }) {
  const t = new Date(trip.departure_time);
  const time = t.toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' });
  const day = t.toLocaleDateString('en-CH', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <button onClick={onClick}
      className="card w-full text-left cursor-pointer p-4 anim-card"
      style={{ animationDelay: `${index * 60}ms` }}>

      {/* Route */}
      <RouteLine from={trip.from_city} to={trip.to_city} />

      {/* Carrier + Price row */}
      <div className="flex items-center justify-between mt-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar state={{ level: 1, base: 'explorer', accessories: [], flair: null }} size="sm" name={trip.carrier_name} avatarId={(trip as any).carrier_avatar} />
          <div className="min-w-0">
            <p className="text-[13px] t-body truncate" style={{ color: 'var(--text-1)' }}>{trip.carrier_name}</p>
            {trip.carrier_reputation != null && <Stars rating={trip.carrier_reputation} />}
          </div>
        </div>

        {trip.price_ton != null ? (
          <div className="flex items-baseline gap-1 flex-shrink-0 pl-2">
            <span className="t-display text-[20px]" style={{ color: 'var(--accent)' }}>{trip.price_ton}</span>
            <span className="text-[11px] font-bold" style={{ color: 'var(--text-3)' }}>TON</span>
          </div>
        ) : (
          <div className="tag flex-shrink-0" style={{ background: 'var(--violet-bg)', color: 'var(--violet)' }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            AI
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="tag" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {day} {time}
        </span>
        <span className="tag" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
          {trip.max_size}
        </span>
        {trip.accepts_passengers && (
          <span className="tag" style={{ background: 'var(--mint-bg)', color: 'var(--mint)' }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {trip.available_seats} seat{trip.available_seats !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─── Request Card ─── */
function RequestCard({ req, onClick, index }: { req: DeliveryRequest; onClick: () => void; index: number }) {
  return (
    <button onClick={onClick} className="card w-full text-left cursor-pointer p-4 anim-card"
      style={{ animationDelay: `${index * 60}ms` }}>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar state={{ level: 1, base: 'explorer', accessories: [], flair: null }} size="sm" name={req.requester_name} />
          <span className="text-[12px] t-body truncate" style={{ color: 'var(--text-2)' }}>{req.requester_name}</span>
        </div>
        {req.budget_ton != null && (
          <div className="flex items-baseline gap-1 flex-shrink-0 pl-2">
            <span className="t-display text-[18px]" style={{ color: 'var(--mint)' }}>{req.budget_ton}</span>
            <span className="text-[11px] font-bold" style={{ color: 'var(--text-3)' }}>TON</span>
          </div>
        )}
      </div>

      <RouteLine from={req.from_city} to={req.to_city} />

      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="tag" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
          {req.package_size}
        </span>
        {req.urgency === 'urgent' && (
          <span className="tag" style={{ background: 'var(--coral-bg)', color: 'var(--coral)' }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            URGENT
          </span>
        )}
        {req.is_errand && (
          <span className="tag" style={{ background: 'var(--violet-bg)', color: 'var(--violet)' }}>ERRAND</span>
        )}
      </div>
    </button>
  );
}

/* ─── FAB ─── */
function FAB() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {open && <div className="fixed inset-0 z-20" style={{ background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)' }} onClick={() => setOpen(false)} />}
      <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-3">
        {open && (
          <div className="flex flex-col gap-2 anim-in">
            {[
              { label: 'Send a package', href: '/request/new', color: 'var(--accent)', iconD: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' },
              { label: 'Post a trip', href: '/trip/new', color: 'var(--amber)', iconD: 'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z' },
            ].map(item => (
              <button key={item.href} onClick={() => { setOpen(false); router.push(item.href); }}
                className="card-solid flex items-center gap-3 pl-3 pr-5 py-3 cursor-pointer" style={{ borderRadius: 14 }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={item.iconD} /></svg>
                </div>
                <span className="text-[14px] t-title" style={{ color: 'var(--text-1)' }}>{item.label}</span>
              </button>
            ))}
          </div>
        )}
        <button onClick={() => setOpen(o => !o)}
          className="w-14 h-14 rounded-[18px] flex items-center justify-center cursor-pointer btn-accent"
          style={{ transition: 'transform 150ms cubic-bezier(.4,0,.2,1)' }}
          aria-label="New">
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
            style={{ transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 250ms cubic-bezier(.34,1.56,.64,1)' }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </>
  );
}

/* ─── Page ─── */
export default function HomePage() {
  const [tab, setTab] = useState<'trips' | 'requests'>('trips');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVoice, setShowVoice] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useApp();

  async function handleVoiceResult(result: VoiceParseResult) {
    if (!user) { showToast('Please log in first', 'error'); return; }
    if (!result.from_city || !result.to_city) {
      // Not enough info — send to form with pre-fill via query params
      const params = new URLSearchParams();
      if (result.from_city) params.set('from', result.from_city);
      if (result.to_city) params.set('to', result.to_city);
      if (result.package_size) params.set('size', result.package_size);
      router.push(`/request/new?${params.toString()}`);
      return;
    }
    // Full info — create request directly and go to match
    try {
      showToast('Creating request...', 'info');
      const req = await createRequest({
        requester_id: user.id as unknown as number,
        from_city: result.from_city,
        to_city: result.to_city,
        package_size: result.package_size || 'small',
        urgency: result.urgency || 'normal',
        package_desc: result.package_desc || undefined,
        budget_ton: result.budget_ton ?? undefined,
        is_errand: result.is_errand,
        errand_details: result.errand_details || undefined,
        deadline: result.deadline || undefined,
      });
      await findMatches(req.id).catch(() => null);
      router.push(`/match/${req.id}`);
    } catch {
      showToast('Failed to create request', 'error');
    }
  }

  useEffect(() => {
    setLoading(true);
    if (tab === 'trips') {
      getTrips({ status: 'active' }).then(setTrips).catch(() => showToast('Failed to load trips', 'error')).finally(() => setLoading(false));
    } else {
      getRequests({ status: 'open' }).then(setRequests).catch(() => showToast('Failed to load requests', 'error')).finally(() => setLoading(false));
    }
  }, [tab, showToast]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {showVoice && <VoiceOverlay onResult={handleVoiceResult} onClose={() => setShowVoice(false)} />}

      {/* ── Gradient header ── */}
      <div className="sticky top-0 z-10" style={{ background: 'var(--bg-gradient)', backdropFilter: 'blur(12px)' }}>
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-glow)' }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </div>
              <div>
                <h1 className="t-display text-[20px] leading-none" style={{ color: 'var(--text-1)' }}>
                  Carry<span style={{ color: 'var(--accent)' }}>TON</span>
                </h1>
                <p className="text-[11px] t-body mt-0.5" style={{ color: 'var(--text-3)' }}>Community delivery</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowVoice(true)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center cursor-pointer"
                style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}
                aria-label="Voice request">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
              <TonConnectButton />
            </div>
          </div>

          {/* Segmented control */}
          <div className="flex p-[3px] rounded-[14px]" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-sm)' }}>
            {(['trips', 'requests'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-[13px] font-bold rounded-[11px] cursor-pointer capitalize"
                style={{
                  background: tab === t ? 'var(--accent)' : 'transparent',
                  color: tab === t ? '#fff' : 'var(--text-3)',
                  boxShadow: tab === t ? '0 2px 8px rgba(42,171,238,.3)' : 'none',
                  transition: 'all 200ms cubic-bezier(.4,0,.2,1)',
                }}>
                {t === 'trips' ? 'Available Trips' : 'Open Requests'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Feed ── */}
      <div className="px-4 pt-3 pb-28 flex flex-col gap-3">
        {loading ? (
          <>{[0,1,2].map(i => <TripCardSkeleton key={i} />)}</>
        ) : tab === 'trips' ? (
          trips.length === 0 ? (
            <EmptyState icon="truck" title="No trips yet" description="Be the first to post one!" actionLabel="Post a trip" onAction={() => router.push('/trip/new')} />
          ) : trips.map((trip, i) => (
            <TripCard key={trip.id} trip={trip} index={i} onClick={() => router.push(`/trip/${trip.id}`)} />
          ))
        ) : (
          requests.length === 0 ? (
            <EmptyState icon="package" title="No open requests" description="Need something delivered?" actionLabel="Post a request" onAction={() => router.push('/request/new')} />
          ) : requests.map((req, i) => (
            <RequestCard key={req.id} req={req} index={i} onClick={() => router.push(`/request/${req.id}`)} />
          ))
        )}
      </div>

      <FAB />
    </div>
  );
}
