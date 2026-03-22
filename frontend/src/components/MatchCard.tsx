'use client';
import type { AIRouteOption, PriceDisplay } from '../../../shared/types';
import { HopVisualization } from './HopVisualization';
import { PriceTag } from './PriceTag';
import { Avatar } from './Avatar';

interface MatchCardProps {
  match: AIRouteOption & { match_id?: number };
  price?: PriceDisplay;
  index: number;
  onAccept: (matchId: number) => void;
  accepting: boolean;
}

function confidenceLabel(confidence: 'high' | 'medium' | 'low') {
  switch (confidence) {
    case 'high': return { text: 'Best match', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
    case 'medium': return { text: 'Good option', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'low': return { text: 'Alternative', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' };
  }
}

export function MatchCard({ match, price, index, onAccept, accepting }: MatchCardProps) {
  const conf = confidenceLabel(match.confidence);
  const isBest = index === 0;
  const hopType = match.hops.length === 1 ? 'Single hop' : 'Multi-hop relay';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Option {index + 1} — {hopType}
          </p>
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${conf.cls}`}>
            {conf.text}
          </span>
        </div>

        {/* Hop visualization */}
        <div className="mb-4">
          <HopVisualization hops={match.hops} />
        </div>

        {/* Carrier info per hop */}
        <div className="flex flex-col gap-2 mb-3">
          {match.hops.map((hop, i) => (
            <div key={i} className="flex items-center gap-2">
              <Avatar
                state={{ level: 1, base: 'explorer', accessories: [], flair: null }}
                size="sm"
                progressPercent={0}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 dark:text-white">{hop.carrier_name}</p>
                <p className="text-[10px] text-gray-500">
                  {hop.from} → {hop.to} · {new Date(hop.departure_time).toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {hop.fee_ton} BXC
              </span>
            </div>
          ))}
        </div>

        {/* AI reasoning */}
        <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed mb-3">
          {match.reasoning}
        </p>

        {/* Bundle discount */}
        {match.bundle_discount_applied && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs font-medium text-green-700 dark:text-green-400">
              🎁 Bundle discount! Your package shares this route with another delivery — you save 20%
            </p>
          </div>
        )}

        {/* Negotiation note */}
        {match.negotiation_note && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-3 py-2 mb-3">
            <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
              💡 {match.negotiation_note}
            </p>
          </div>
        )}
      </div>

      {/* Price section */}
      <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Total fee</p>
            <PriceTag amount={match.total_fee_ton} size="lg" />
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Est. arrival</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {match.estimated_duration_hours < 1
                ? `${Math.round(match.estimated_duration_hours * 60)} min`
                : `${match.estimated_duration_hours.toFixed(1)}h`}
            </p>
          </div>
          <div className="flex -space-x-2">
            {match.hops.map((_, i) => (
              <Avatar
                key={i}
                state={{ level: 1, base: 'explorer', accessories: [], flair: null }}
                size="sm"
                progressPercent={0}
              />
            ))}
          </div>
        </div>

        {/* Accept button */}
        <button
          onClick={() => match.match_id && onAccept(match.match_id)}
          disabled={accepting || !match.match_id}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
            isBest
              ? 'bg-[#2AABEE] text-white shadow-sm'
              : 'border-2 border-[#2AABEE] text-[#2AABEE] bg-transparent'
          }`}
        >
          {accepting
            ? 'Processing…'
            : `Accept & pay ${match.total_fee_ton} BXC${price ? ` (~${price.fiat_symbol} ${price.fiat_amount.toFixed(2)})` : ''}`}
        </button>
      </div>
    </div>
  );
}
