'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TonConnectButton } from '@tonconnect/ui-react';
import { useApp } from '@/providers/AppProvider';
import { getUserAvatar, getTrips, getRequests } from '@/lib/api';
import type { AvatarState, UserBadge, Trip, DeliveryRequest } from '../../../../shared/types';
import { BADGES, AVATAR_LEVELS } from '../../../../shared/types';
import { Avatar } from '@/components/Avatar';
import { XPProgressBar } from '@/components/XPProgressBar';
import { BadgeGrid } from '@/components/BadgeGrid';

// ---- SVG Stars ----
function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={14} height={14} viewBox="0 0 20 20" fill={i <= full ? '#FBBF24' : 'none'} stroke={i <= full ? '#FBBF24' : 'var(--text-3)'} strokeWidth={1.5}>
          <path d="M10 1.5l2.47 5.01L18 7.27l-4 3.9.95 5.53L10 14.27 5.05 16.7 6 11.17l-4-3.9 5.53-.76L10 1.5z" />
        </svg>
      ))}
      <span className="text-xs ml-1 font-medium" style={{ color: 'var(--text-2)' }}>{rating.toFixed(1)}</span>
    </span>
  );
}

// ---- Stat box ----
function StatBox({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="card p-3.5 flex flex-col items-center gap-1 cursor-default">
      <div style={{ color: 'var(--blue)' }}>{icon}</div>
      <span className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>{value}</span>
      <span className="text-[11px] font-medium text-center leading-tight" style={{ color: 'var(--text-2)' }}>{label}</span>
    </div>
  );
}

// ---- Activity item ----
interface ActivityEntry {
  id: string;
  from: string;
  to: string;
  role: 'Carrier' | 'Requester';
  date: string;
  sortKey: string;
  amount: number | null;
  status: string;
}

function ActivityItem({ item }: { item: ActivityEntry }) {
  const isCarrier = item.role === 'Carrier';
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border-2)' }}>
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: isCarrier ? 'var(--blue-light)' : 'rgba(139,92,246,0.08)' }}
      >
        {isCarrier ? (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth={2} strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
        ) : (
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth={2} strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
          {item.from} → {item.to}
        </p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>{item.role} · {item.date}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {item.amount != null && (
          <p className="text-sm font-bold" style={{ color: isCarrier ? 'var(--green)' : 'var(--text-2)' }}>
            {isCarrier ? '+' : '-'}{item.amount} BXC
          </p>
        )}
        <span className="pill text-[10px]" style={{
          background: item.status === 'confirmed' || item.status === 'completed'
            ? 'var(--green-light)' : 'var(--blue-light)',
          color: item.status === 'confirmed' || item.status === 'completed'
            ? '#15803D' : 'var(--blue)',
        }}>
          {item.status}
        </span>
      </div>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-CH', { month: 'short', day: 'numeric' });
}

function memberSince(iso: string) {
  return new Date(iso).toLocaleDateString('en-CH', { month: 'long', year: 'numeric' });
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useApp();
  const [avatarData, setAvatarData] = useState<{ avatar: AvatarState; next_level_xp: number; progress_percent: number } | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    const uid = typeof user.id === 'string' ? parseInt(user.id) : user.id;

    getUserAvatar(uid).then(setAvatarData).catch(() => null);

    Promise.all([
      Promise.all([
        getTrips({ status: 'active' }),
        getTrips({ status: 'matched' }),
        getTrips({ status: 'completed' }),
      ]).then((arrs) => arrs.flat()).catch(() => [] as Trip[]),
      Promise.all([
        getRequests({ status: 'open' }),
        getRequests({ status: 'matched' }),
        getRequests({ status: 'confirmed' }),
      ]).then((arrs) => arrs.flat()).catch(() => [] as DeliveryRequest[]),
    ]).then(([trips, requests]) => {
      const carrierItems: ActivityEntry[] = trips
        .filter((t) => t.carrier_id === uid)
        .map((t) => ({
          id: `trip-${t.id}`,
          from: t.from_city, to: t.to_city,
          role: 'Carrier' as const,
          date: fmtDate(t.departure_time),
          sortKey: t.departure_time,
          amount: t.price_ton,
          status: t.status,
        }));

      const requesterItems: ActivityEntry[] = requests
        .filter((r) => r.requester_id === uid)
        .map((r) => ({
          id: `req-${r.id}`,
          from: r.from_city, to: r.to_city,
          role: 'Requester' as const,
          date: fmtDate(r.created_at),
          sortKey: r.created_at,
          amount: r.budget_ton,
          status: r.status,
        }));

      const all = [...carrierItems, ...requesterItems]
        .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
        .slice(0, 10);
      setActivity(all);
    });
  }, [user]);

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="anim-spin" style={{ color: 'var(--blue)' }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-3" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-2)' }}>Open in Telegram to see your profile.</p>
      </div>
    );
  }

  const avatar = avatarData?.avatar ?? { level: 1, base: 'explorer', accessories: [], flair: null };
  const nextLevelXp = avatarData?.next_level_xp ?? 50;
  const progressPct = avatarData?.progress_percent ?? 0;
  const levelInfo = AVATAR_LEVELS.find((l) => l.level === avatar.level) ?? AVATAR_LEVELS[0];

  const currentLevelMinXp = levelInfo.xp_min;
  const xpInLevel = (user.xp ?? 0) - currentLevelMinXp;
  const xpNeeded = nextLevelXp - currentLevelMinXp;
  const earnedBadges: UserBadge[] = (user as any).badges ?? [];

  const walletAddr = user.wallet_address;

  return (
    <div className="min-h-screen anim-in" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Profile</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-5 pb-24">

        {/* Avatar section */}
        <div className="flex flex-col items-center gap-2.5 pt-3">
          <button onClick={() => router.push('/avatar')} className="cursor-pointer relative group">
            <Avatar state={avatar} size="lg" progressPercent={progressPct} name={user.display_name ?? undefined} avatarId={user.avatar_id} />
            <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,.2)' }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
          </button>

          <p className="text-xl font-bold mt-1" style={{ color: 'var(--text-1)' }}>
            {user.display_name ?? user.username ?? 'Anonymous'}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            @{user.username ?? '—'} · Member since {memberSince(user.created_at)}
          </p>
          <Stars rating={user.reputation ?? 0} />

          {/* Level badge */}
          <span
            className="pill text-sm font-semibold px-4 py-1.5"
            style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            {levelInfo.name} — Level {avatar.level}
          </span>

          {/* XP progress */}
          <div className="w-full max-w-xs mt-1">
            <XPProgressBar
              current={Math.max(0, xpInLevel)}
              max={xpNeeded}
              level={avatar.level}
              levelName={levelInfo.name}
            />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Trips posted" value={user.total_trips ?? 0}
            icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>} />
          <StatBox label="Deliveries" value={user.total_deliveries ?? 0}
            icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>} />
          <StatBox label="BXC earned" value={`${activity.filter(a => a.role === 'Carrier' && a.amount).reduce((sum, a) => sum + (a.amount ?? 0), 0).toFixed(1)}`}
            icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 9.5l10 12.5 10-12.5L12 2zm0 3.26L18.6 9.5 12 18.08 5.4 9.5 12 5.26z" /></svg>} />
          <StatBox label="Reputation" value={`${(user.reputation ?? 0).toFixed(1)}`}
            icon={<svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>} />
        </div>

        {/* Badges */}
        <div>
          <p className="text-base font-bold mb-3" style={{ color: 'var(--text-1)' }}>Your badges</p>
          <BadgeGrid earned={earnedBadges} all={BADGES} />
        </div>

        {/* Wallet */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth={2} strokeLinecap="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 10H2" /></svg>
            <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Wallet</p>
          </div>
          {walletAddr ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>Connected</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-1)' }}>
                  {walletAddr.slice(0, 8)}...{walletAddr.slice(-6)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-2)' }}>Balance</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Testnet</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <TonConnectButton />
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Connect your wallet to send and receive BXC payments.
              </p>
            </div>
          )}
        </div>

        {/* Activity history */}
        <div>
          <p className="text-base font-bold mb-3" style={{ color: 'var(--text-1)' }}>Recent activity</p>
          <div className="card px-4">
            {activity.length === 0 ? (
              <div className="py-10 text-center">
                <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeLinecap="round" className="mx-auto mb-2">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                  <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
                </svg>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>No activity yet</p>
              </div>
            ) : (
              activity.map((item) => <ActivityItem key={item.id} item={item} />)
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
