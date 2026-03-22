'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import type { Trip } from '../../../../../shared/types';
import { PriceTag } from '@/components/PriceTag';
import { CityRoute } from '@/components/CityRoute';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<(Trip & { carrier_name?: string; carrier_reputation?: number }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/trips/${id}`)
      .then((r) => r.json())
      .then((d) => setTrip(d.trip))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="anim-spin" style={{ color: 'var(--accent)' }}>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <p style={{ color: 'var(--text-2)' }}>Trip not found.</p>
        <button onClick={() => router.push('/')} className="mt-4 text-sm font-semibold cursor-pointer" style={{ color: 'var(--accent)' }}>Go home</button>
      </div>
    );
  }

  const hasPackages = !trip.accepts_passengers || trip.max_size !== 'small' || trip.price_ton != null;
  const hasPassengers = trip.accepts_passengers && trip.available_seats > 0;

  return (
    <div className="min-h-screen anim-in" style={{ background: 'var(--bg)' }}>
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full cursor-pointer"
          style={{ color: 'var(--text-2)' }} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Trip details</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4 pb-24">
        {/* Route card */}
        <div className="card p-4">
          <CityRoute from={trip.from_city} to={trip.to_city} departureTime={trip.departure_time} carrierName={trip.carrier_name} />
        </div>

        {/* Carrier info */}
        <div className="card p-4 flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Carrier</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{trip.carrier_name ?? 'Unknown'}</span>
          </div>
          {trip.carrier_reputation != null && (
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>Rating</span>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width={12} height={12} viewBox="0 0 20 20"
                    fill={i <= Math.round(trip.carrier_reputation!) ? 'var(--amber)' : 'none'}
                    stroke={i <= Math.round(trip.carrier_reputation!) ? 'var(--amber)' : 'var(--text-3)'} strokeWidth={1.5}>
                    <path d="M10 1.5l2.47 5.01L18 7.27l-4 3.9.95 5.53L10 14.27 5.05 16.7 6 11.17l-4-3.9 5.53-.76L10 1.5z"/>
                  </svg>
                ))}
                <span className="text-xs font-medium ml-1" style={{ color: 'var(--text-2)' }}>{trip.carrier_reputation.toFixed(1)}</span>
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Status</span>
            <span className="tag text-[10px]" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{trip.status}</span>
          </div>
        </div>

        {/* What they carry */}
        <div className="card p-4 flex flex-col gap-3">
          <p className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Offers</p>

          {/* Packages */}
          {hasPackages && (
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--accent-bg)' }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Package delivery</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  Up to <span className="font-semibold capitalize">{trip.max_size}</span> size
                </p>
                <div className="mt-2">
                  {trip.price_ton != null ? (
                    <PriceTag amount={trip.price_ton} size="sm" />
                  ) : (
                    <span className="tag text-[10px]" style={{ background: 'var(--violet-bg)', color: 'var(--violet)' }}>AI-priced</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Passengers */}
          {hasPassengers && (
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--mint-bg)' }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth={2} strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Passenger ride</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-2)' }}>
                  <span className="font-semibold">{trip.available_seats}</span> seat{trip.available_seats !== 1 ? 's' : ''} available
                </p>
              </div>
            </div>
          )}

          {!hasPackages && !hasPassengers && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>No capacity specified</p>
          )}
        </div>

        {/* Notes */}
        {trip.notes && (
          <div className="card p-4">
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-1)' }}>Notes</p>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{trip.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
