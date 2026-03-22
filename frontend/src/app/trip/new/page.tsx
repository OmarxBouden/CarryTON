'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/providers/AppProvider';
import { createTrip } from '@/lib/api';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { useToast } from '@/components/Toast';

const SIZES = [
  { value: 'small', label: 'Small', desc: 'Envelope / bag' },
  { value: 'medium', label: 'Medium', desc: 'Box / suitcase' },
  { value: 'large', label: 'Large', desc: 'Furniture / heavy' },
] as const;

type Size = typeof SIZES[number]['value'];

function defaultDepartureTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
}

export default function NewTripPage() {
  const router = useRouter();
  const { user, tonPrice } = useApp();

  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [departureTime, setDepartureTime] = useState(defaultDepartureTime());
  const [notes, setNotes] = useState('');

  // Package section
  const [offersPackages, setOffersPackages] = useState(true);
  const [size, setSize] = useState<Size>('small');
  const [packagePrice, setPackagePrice] = useState('');

  // Passenger section
  const [offersPassengers, setOffersPassengers] = useState(false);
  const [seats, setSeats] = useState(2);
  const [seatPrice, setSeatPrice] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const fiatPreview = (val: string) => val
    ? `~CHF ${(parseFloat(val) * (tonPrice?.ton_chf ?? 2.5)).toFixed(2)}`
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromCity || !toCity) { setError('Please fill in both cities.'); return; }
    if (!user) { setError('You must be logged in.'); return; }
    if (!offersPackages && !offersPassengers) { setError('Select at least one: packages or passengers.'); return; }
    setError('');
    setLoading(true);
    try {
      await createTrip({
        carrier_id: user.id as unknown as number,
        from_city: fromCity,
        to_city: toCity,
        departure_time: new Date(departureTime).toISOString(),
        max_size: offersPackages ? size : 'small',
        price_ton: offersPackages && packagePrice ? parseFloat(packagePrice) : undefined,
        accepts_passengers: offersPassengers,
        available_seats: offersPassengers ? seats : 0,
        notes: notes || undefined,
      } as any);
      showToast('Trip posted!', 'success');
      setTimeout(() => router.push('/'), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const checkboxStyle = (checked: boolean) =>
    `w-full flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
      checked
        ? 'border-[#2AABEE] bg-blue-50 dark:bg-blue-900/10'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black anim-in">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-4 pb-3 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.push('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700 dark:text-gray-300">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Post a trip</h1>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-5 flex flex-col gap-5 pb-24">
        <CityAutocomplete label="From" value={fromCity} onChange={setFromCity} placeholder="Departure city" />
        <CityAutocomplete label="To" value={toCity} onChange={setToCity} placeholder="Destination city" />

        {/* Departure time */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Departure time</label>
          <input type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2AABEE]" />
        </div>

        {/* ── What can you carry? ── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What can you carry?</label>
          <p className="text-xs text-gray-400 mb-3">Select one or both. At least one is required.</p>

          {/* Packages checkbox */}
          <button type="button" onClick={() => setOffersPackages(v => !v)} className={checkboxStyle(offersPackages)}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              offersPackages ? 'bg-[#2AABEE] border-[#2AABEE]' : 'border-gray-300 dark:border-gray-600'
            }`}>
              {offersPackages && <svg width={12} height={12} viewBox="0 0 20 20" fill="#fff"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
            </div>
            <div className="flex items-center gap-2">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Packages</p>
                <p className="text-xs text-gray-400">Carry deliveries for others</p>
              </div>
            </div>
          </button>

          {/* Package options (shown when checked) */}
          {offersPackages && (
            <div className="mt-3 ml-2 pl-4 border-l-2 border-[#2AABEE]/20 flex flex-col gap-4">
              {/* Size */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Max package size</label>
                <div className="grid grid-cols-3 gap-2">
                  {SIZES.map((s) => (
                    <button key={s.value} type="button" onClick={() => setSize(s.value)}
                      className={`py-3 rounded-xl border-2 text-center transition-colors ${
                        size === s.value
                          ? 'bg-[#2AABEE] border-[#2AABEE] text-white'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                      <div className="text-xs font-bold">{s.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">{s.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Price per delivery <span className="font-normal">(optional)</span></label>
                <div className="relative">
                  <input type="number" min="0" step="0.1" value={packagePrice} onChange={(e) => setPackagePrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-16 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">TON</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 ml-1">
                  {fiatPreview(packagePrice) || 'Leave blank — AI sets a fair price based on the route'}
                </p>
              </div>
            </div>
          )}

          {/* Passengers checkbox */}
          <button type="button" onClick={() => setOffersPassengers(v => !v)} className={`${checkboxStyle(offersPassengers)} mt-3`}>
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              offersPassengers ? 'bg-[#2AABEE] border-[#2AABEE]' : 'border-gray-300 dark:border-gray-600'
            }`}>
              {offersPassengers && <svg width={12} height={12} viewBox="0 0 20 20" fill="#fff"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
            </div>
            <div className="flex items-center gap-2">
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Passengers</p>
                <p className="text-xs text-gray-400">Offer rides to people going your way</p>
              </div>
            </div>
          </button>

          {/* Passenger options (shown when checked) */}
          {offersPassengers && (
            <div className="mt-3 ml-2 pl-4 border-l-2 border-[#2AABEE]/20 flex flex-col gap-4">
              {/* Seats */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Available seats</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button key={n} type="button" onClick={() => setSeats(n)}
                      className={`py-3 rounded-xl border-2 text-center transition-colors ${
                        seats === n
                          ? 'bg-[#2AABEE] border-[#2AABEE] text-white'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                      <div className="text-sm font-bold">{n}</div>
                      <div className="text-[10px] opacity-70">seat{n > 1 ? 's' : ''}</div>
                    </button>
                  ))}
                </div>
              </div>
              {/* Seat price */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Price per seat <span className="font-normal">(optional)</span></label>
                <div className="relative">
                  <input type="number" min="0" step="0.1" value={seatPrice} onChange={(e) => setSeatPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 pr-20 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">TON/seat</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 ml-1">
                  {fiatPreview(seatPrice) || 'Leave blank — AI sets a fair price per seat'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Notes <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., can pick up along A1 highway, AC available, pet-friendly"
            rows={2}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2AABEE] resize-none" />
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-[#2AABEE] text-white rounded-2xl py-4 text-base font-bold disabled:opacity-60 active:scale-[0.98] transition-transform shadow-sm mt-1">
          {loading ? 'Posting…' : 'Post trip'}
        </button>
      </form>
    </div>
  );
}
