'use client';
import { useState } from 'react';
import type { Badge, UserBadge } from '../../../shared/types';

interface BadgeGridProps {
  earned: UserBadge[];
  all: Badge[];
}

const tierBorder: Record<string, string> = {
  bronze: 'border-amber-400',
  silver: 'border-gray-400',
  gold:   'border-yellow-400',
};

const tierBg: Record<string, string> = {
  bronze: 'bg-amber-50 dark:bg-amber-900/20',
  silver: 'bg-gray-50 dark:bg-gray-800',
  gold:   'bg-yellow-50 dark:bg-yellow-900/20',
};

export function BadgeGrid({ earned, all }: BadgeGridProps) {
  const earnedIds = new Set(earned.map((b) => b.badge_id));
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-3 gap-3">
      {all.map((badge) => {
        const isEarned = earnedIds.has(badge.id);
        const isHovered = hoveredId === badge.id;
        return (
          <div
            key={badge.id}
            className={`relative flex flex-col items-center text-center p-3 rounded-2xl border-2 transition-all cursor-default ${
              isEarned
                ? `${tierBg[badge.tier]} ${tierBorder[badge.tier]}`
                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 opacity-40'
            }`}
            onMouseEnter={() => isEarned && setHoveredId(badge.id)}
            onMouseLeave={() => setHoveredId(null)}
            onTouchStart={() => isEarned && setHoveredId(isHovered ? null : badge.id)}
          >
            <span className="text-2xl mb-1">{isEarned ? badge.emoji : '?'}</span>
            <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">
              {badge.name}
            </p>
            {!isEarned && (
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight line-clamp-2">
                {badge.description}
              </p>
            )}

            {/* Tooltip on hover/tap for earned badges */}
            {isEarned && isHovered && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full z-20 w-48 p-2.5 rounded-xl text-xs text-left leading-snug"
                style={{
                  background: 'var(--surface, #fff)',
                  color: 'var(--text-2, #475569)',
                  boxShadow: '0 4px 20px rgba(0,0,0,.15)',
                  border: '1px solid var(--border, rgba(0,0,0,.06))',
                }}>
                <p className="font-bold mb-0.5" style={{ color: 'var(--text-1, #0B1120)' }}>{badge.emoji} {badge.name}</p>
                <p>{badge.description}</p>
                <p className="mt-1 font-semibold capitalize" style={{ color: badge.tier === 'gold' ? '#CA8A04' : badge.tier === 'silver' ? '#6B7280' : '#D97706' }}>
                  {badge.tier} tier
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
