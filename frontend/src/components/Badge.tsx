import type { Badge as BadgeType } from '../../../shared/types';

interface BadgeProps {
  badge: BadgeType;
  size?: 'sm' | 'md';
}

const tierStyles: Record<string, { bg: string; border: string; text: string }> = {
  bronze: {
    bg: 'rgba(217, 119, 6, 0.08)',
    border: 'rgba(217, 119, 6, 0.2)',
    text: '#B45309',
  },
  silver: {
    bg: 'rgba(107, 114, 128, 0.08)',
    border: 'rgba(107, 114, 128, 0.2)',
    text: '#4B5563',
  },
  gold: {
    bg: 'rgba(234, 179, 8, 0.1)',
    border: 'rgba(234, 179, 8, 0.3)',
    text: '#A16207',
  },
};

const tierStylesDark: Record<string, { bg: string; border: string; text: string }> = {
  bronze: { bg: 'rgba(217, 119, 6, 0.15)', border: 'rgba(217, 119, 6, 0.3)', text: '#FBBF24' },
  silver: { bg: 'rgba(156, 163, 175, 0.12)', border: 'rgba(156, 163, 175, 0.25)', text: '#D1D5DB' },
  gold: { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.3)', text: '#FDE047' },
};

export function Badge({ badge, size = 'md' }: BadgeProps) {
  const padding = size === 'sm' ? 'px-2 py-[3px]' : 'px-2.5 py-1';
  const text = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const light = tierStyles[badge.tier] || tierStyles.silver;
  const dark = tierStylesDark[badge.tier] || tierStylesDark.silver;

  return (
    <span
      className={`pill ${padding} ${text} font-semibold cursor-default`}
      title={badge.description}
      style={{
        // Use CSS custom properties for theme switching
        background: `var(--badge-bg, ${light.bg})`,
        border: `1px solid var(--badge-border, ${light.border})`,
        color: `var(--badge-text, ${light.text})`,
        // Dark mode overrides via class
        ['--badge-bg' as string]: light.bg,
        ['--badge-border' as string]: light.border,
        ['--badge-text' as string]: light.text,
      }}
    >
      <span className="text-[1.1em]">{badge.emoji}</span>
      <span>{badge.name}</span>
    </span>
  );
}
