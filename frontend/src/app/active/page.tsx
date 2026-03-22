'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/providers/AppProvider';
import type { Match, MatchHop } from '../../../../shared/types';
import { PriceTag } from '@/components/PriceTag';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ActiveJob {
  match: Match;
  hops: MatchHop[];
}

export default function ActivePage() {
  const router = useRouter();
  const { user, loading: userLoading } = useApp();
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all matches and filter to active ones
    async function fetchJobs() {
      try {
        // Get matches by checking requests for the current user
        const res = await fetch(`${BASE_URL}/requests?status=matched`);
        const data = await res.json();
        const requests = data.requests || [];

        const res2 = await fetch(`${BASE_URL}/requests?status=in_transit`);
        const data2 = await res2.json();
        const inTransit = data2.requests || [];

        const res3 = await fetch(`${BASE_URL}/requests?status=delivered`);
        const data3 = await res3.json();
        const delivered = data3.requests || [];

        const allRequests = [...requests, ...inTransit, ...delivered];

        // For each request, try to get the match via by-request endpoint
        const matchPromises = allRequests.map(async (req: { id: number }) => {
          try {
            const mRes = await fetch(`${BASE_URL}/matches/by-request/${req.id}`);
            if (!mRes.ok) return null;
            const mData = await mRes.json();
            if (mData.match) return { match: mData.match, hops: mData.hops || [] };
            return null;
          } catch {
            return null;
          }
        });

        const results = (await Promise.all(matchPromises)).filter(Boolean) as ActiveJob[];
        setJobs(results);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [user]);

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="anim-spin" style={{ color: 'var(--blue)' }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen anim-in" style={{ background: 'var(--bg)' }}>
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Active deliveries</h1>
      </div>

      <div className="px-4 py-4 flex flex-col gap-3 pb-24">
        {jobs.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--surface-3)' }}>
              <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth={1.5} strokeLinecap="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
              </svg>
            </div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>No active deliveries</p>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>Your in-progress deliveries will appear here.</p>
          </div>
        ) : (
          jobs.map((job) => {
            const from = job.hops[0]?.from_city ?? '?';
            const to = job.hops[job.hops.length - 1]?.to_city ?? '?';
            const statusColors: Record<string, string> = {
              accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
              in_transit: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
              delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            };
            return (
              <button
                key={job.match.id}
                onClick={() => router.push(`/job/${job.match.id}`)}
                className="card p-4 text-left w-full cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-base font-bold text-gray-900 dark:text-white">{from} → {to}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[job.match.status] || 'bg-gray-100 text-gray-600'}`}>
                    {job.match.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{job.hops.length} hop{job.hops.length !== 1 ? 's' : ''}</span>
                  <PriceTag amount={job.match.total_fee_ton} size="sm" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
