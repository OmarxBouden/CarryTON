'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/providers/AppProvider';
import { createRequest, findMatches, type VoiceParseResult } from '@/lib/api';
import { CityAutocomplete } from '@/components/CityAutocomplete';
import { VoiceOverlay } from '@/components/VoiceOverlay';
import { useToast } from '@/components/Toast';

const SIZES = [
  { value: 'small', label: 'Small', emoji: '📦' },
  { value: 'medium', label: 'Medium', emoji: '📦📦' },
  { value: 'large', label: 'Large', emoji: '📦📦📦' },
] as const;

type Size = typeof SIZES[number]['value'];

function defaultDeadline() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5"
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className={`w-11 h-6 rounded-full flex-shrink-0 ml-3 transition-colors relative ${checked ? 'bg-[#2AABEE]' : 'bg-gray-200 dark:bg-gray-600'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </button>
  );
}

export default function NewRequestPage() {
  const router = useRouter();
  const { user, tonPrice } = useApp();

  const [reqType, setReqType] = useState<'package' | 'passenger'>('package');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [flexible, setFlexible] = useState(false);
  const [size, setSize] = useState<Size>('small');
  const [description, setDescription] = useState('');
  const [budgetTon, setBudgetTon] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [errand, setErrand] = useState(false);
  const [errandDetails, setErrandDetails] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const { showToast } = useToast();

  function handleVoiceResult(result: VoiceParseResult) {
    if (result.from_city) setFromCity(result.from_city);
    if (result.to_city) setToCity(result.to_city);
    if (result.package_size) setSize(result.package_size);
    if (result.urgency === 'urgent') setUrgent(true);
    if (result.package_desc) setDescription(result.package_desc);
    if (result.budget_ton != null) setBudgetTon(String(result.budget_ton));
    if (result.is_errand) { setErrand(true); if (result.errand_details) setErrandDetails(result.errand_details); }
    if (result.deadline) { setFlexible(false); setDeadline(result.deadline.slice(0, 16)); }
    showToast('Voice input applied!', 'success');
  }

  const fiatPreview = budgetTon
    ? `= ~CHF ${(parseFloat(budgetTon) * (tonPrice?.ton_chf ?? 2.5)).toFixed(2)}`
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromCity || !toCity) { setError('Please fill in both cities.'); return; }
    if (!user) { setError('You must be logged in.'); return; }
    setError('');
    setLoading(true);
    try {
      const req = await createRequest({
        requester_id: user.id as unknown as number,
        type: reqType,
        from_city: fromCity,
        to_city: toCity,
        deadline: flexible ? undefined : new Date(deadline).toISOString(),
        package_size: reqType === 'package' ? size : 'small',
        package_desc: reqType === 'package' ? (description || undefined) : undefined,
        budget_ton: budgetTon ? parseFloat(budgetTon) : undefined,
        urgency: urgent ? 'urgent' : 'normal',
        is_errand: reqType === 'package' ? errand : false,
        errand_details: reqType === 'package' && errand && errandDetails ? errandDetails : undefined,
        passenger_count: reqType === 'passenger' ? passengerCount : 0,
      } as any);
      // Immediately trigger AI matching (fire & forget errors)
      await findMatches(req.id).catch(() => null);
      router.push(`/match/${req.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black anim-in">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-4 pb-3 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700 dark:text-gray-300">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Post a request</h1>
      </div>

      {showVoice && <VoiceOverlay onResult={handleVoiceResult} onClose={() => setShowVoice(false)} />}

      <form onSubmit={handleSubmit} className="px-4 py-5 flex flex-col gap-5 pb-24">
        {/* Voice input button */}
        <button type="button" onClick={() => setShowVoice(true)}
          className="w-full flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
          style={{ background: 'var(--accent-bg, #E8F7FE)', border: '1.5px dashed var(--accent, #2AABEE)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--accent, #2AABEE)' }}>
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-sm font-bold" style={{ color: 'var(--accent, #2AABEE)' }}>Describe your delivery</p>
            <p className="text-xs" style={{ color: 'var(--text-3, #9CA3AF)' }}>&ldquo;Send a small package from Nyon to Geneva&rdquo;</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'var(--border, rgba(0,0,0,.06))' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--text-3, #9CA3AF)' }}>or fill manually</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border, rgba(0,0,0,.06))' }} />
        </div>

        {/* Type toggle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">What do you need?</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setReqType('package')}
              className={`py-3.5 rounded-xl border-2 text-center transition-colors ${
                reqType === 'package'
                  ? 'bg-[#2AABEE] border-[#2AABEE] text-white'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
              <div className="flex items-center justify-center gap-2">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
                </svg>
                <span className="text-sm font-semibold">Send package</span>
              </div>
            </button>
            <button type="button" onClick={() => setReqType('passenger')}
              className={`py-3.5 rounded-xl border-2 text-center transition-colors ${
                reqType === 'passenger'
                  ? 'bg-[#2AABEE] border-[#2AABEE] text-white'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}>
              <div className="flex items-center justify-center gap-2">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="text-sm font-semibold">Get a ride</span>
              </div>
            </button>
          </div>
        </div>

        <CityAutocomplete label="From" value={fromCity} onChange={setFromCity} placeholder={reqType === 'passenger' ? 'Pickup location' : 'Pickup city'} />
        <CityAutocomplete label="To" value={toCity} onChange={setToCity} placeholder={reqType === 'passenger' ? 'Drop-off location' : 'Destination city'} />

        {/* Deadline */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Deadline
          </label>
          {!flexible && (
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2AABEE] mb-2"
            />
          )}
          <Toggle
            label="Flexible — no deadline"
            checked={flexible}
            onChange={setFlexible}
          />
        </div>

        {/* Passenger count (passenger mode only) */}
        {reqType === 'passenger' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Number of passengers
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button key={n} type="button" onClick={() => setPassengerCount(n)}
                  className={`py-3.5 rounded-xl border-2 text-center transition-colors ${
                    passengerCount === n
                      ? 'bg-[#2AABEE] border-[#2AABEE] text-white'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}>
                  <div className="text-lg leading-none mb-1">
                    {'👤'.repeat(Math.min(n, 2))}{n > 2 ? `+${n - 2}` : ''}
                  </div>
                  <div className="text-xs font-semibold">{n} seat{n > 1 ? 's' : ''}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Package size (package mode only) */}
        {reqType === 'package' && <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Package size
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSize(s.value)}
                className={`py-3.5 rounded-xl border-2 text-center transition-colors ${
                  size === s.value
                    ? 'bg-[#2AABEE] border-[#2AABEE] text-white'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="text-lg leading-none mb-1">{s.emoji}</div>
                <div className="text-xs font-semibold">{s.label}</div>
              </button>
            ))}
          </div>
        </div>}

        {/* Package description (package only) */}
        {reqType === 'package' && <>
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Package description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Blue backpack, small envelope, etc."
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]"
          />
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Budget <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.1"
              value={budgetTon}
              onChange={(e) => setBudgetTon(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 pr-16 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2AABEE]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">TON</span>
          </div>
          {fiatPreview ? (
            <p className="text-xs text-[#2AABEE] mt-1.5 ml-1">{fiatPreview}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1.5 ml-1">Our AI will suggest a fair price based on the route</p>
          )}
        </div>

        {/* Urgency */}
        <div className="flex flex-col gap-2">
          <Toggle
            label="Urgent delivery"
            description="Priority matching, ~50% higher fee"
            checked={urgent}
            onChange={setUrgent}
          />
          {urgent && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                ⚡ Urgent adds ~50% to the fee but gets priority matching
              </p>
            </div>
          )}
        </div>

        {/* Errand mode (package only) */}
        <div className="flex flex-col gap-2">
          <Toggle
            label="This is an errand"
            description="Carrier must pick something up for you"
            checked={errand}
            onChange={setErrand}
          />
          {errand && (
            <textarea
              value={errandDetails}
              onChange={(e) => setErrandDetails(e.target.value)}
              placeholder="Pick up parcel ref 348XZ from Geneva Post Office, Rue du Mont-Blanc 18"
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2AABEE] resize-none"
            />
          )}
        </div>
        </>}

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#2AABEE] text-white rounded-2xl py-4 text-base font-bold disabled:opacity-60 active:scale-[0.98] transition-transform shadow-sm mt-1"
        >
          {loading ? 'Finding carriers…' : reqType === 'passenger' ? 'Find a ride' : 'Find a carrier'}
        </button>
      </form>
    </div>
  );
}
