import type { AvatarState } from '../../../shared/types';
import { ANIMAL_AVATARS } from '../../../shared/types';
import { AnimalSvg } from './AnimalAvatar';

interface AvatarProps {
  state: AvatarState;
  size?: 'sm' | 'md' | 'lg';
  progressPercent?: number;
  name?: string;
  avatarId?: string | null;
}

const sizeMap = {
  sm: { outer: 32, inner: 26, text: 'text-[11px]', stroke: 2.5, badge: 10, animal: 20 },
  md: { outer: 48, inner: 40, text: 'text-sm', stroke: 3, badge: 14, animal: 30 },
  lg: { outer: 80, inner: 68, text: 'text-xl', stroke: 3.5, badge: 20, animal: 50 },
};

const levelGradient: Record<number, [string, string]> = {
  1: ['#94A3B8', '#64748B'],
  2: ['#60A5FA', '#3B82F6'],
  3: ['#A78BFA', '#7C3AED'],
  4: ['#FBBF24', '#F59E0B'],
  5: ['#F472B6', '#EC4899'],
};

export function Avatar({ state, size = 'md', progressPercent = 0, name, avatarId }: AvatarProps) {
  const { outer, inner, text, stroke, badge, animal } = sizeMap[size];
  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePct = Math.max(0, Math.min(100, progressPercent));
  const dashOffset = circumference * (1 - safePct / 100);

  // Find animal config
  const animalConfig = avatarId ? ANIMAL_AVATARS.find(a => a.id === avatarId) : null;

  // Background: animal color or level gradient
  const [from, to] = animalConfig
    ? [animalConfig.color, animalConfig.color]
    : (levelGradient[state.level] || levelGradient[1]);

  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: outer, height: outer }}>
      {/* Progress ring */}
      <svg className="absolute inset-0 -rotate-90" width={outer} height={outer} viewBox={`0 0 ${outer} ${outer}`}>
        <circle cx={outer / 2} cy={outer / 2} r={radius}
          fill="none" strokeWidth={stroke} style={{ stroke: 'var(--border, #e2e8f0)' }} />
        {safePct > 0 && (
          <circle cx={outer / 2} cy={outer / 2} r={radius}
            fill="none" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={dashOffset}
            style={{ stroke: animalConfig?.color || 'var(--accent, #2AABEE)', transition: 'stroke-dashoffset 600ms ease' }} />
        )}
      </svg>

      {/* Avatar circle */}
      <div className="rounded-full flex items-center justify-center overflow-hidden"
        style={{
          width: inner, height: inner,
          background: animalConfig
            ? `${animalConfig.bg}`
            : `linear-gradient(135deg, ${from}, ${to})`,
        }}>
        {animalConfig ? (
          <AnimalSvg id={animalConfig.id} size={animal} color={animalConfig.color} />
        ) : initials ? (
          <span className={`${text} font-bold text-white leading-none`}>{initials}</span>
        ) : (
          <svg width={inner * 0.5} height={inner * 0.5} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>

      {/* Level badge */}
      {size !== 'sm' && (
        <span className="absolute flex items-center justify-center rounded-full text-white font-bold shadow-md"
          style={{
            width: badge, height: badge, fontSize: badge * 0.55,
            background: animalConfig?.color || to,
            bottom: -1, right: -1,
            border: '2px solid var(--surface, #fff)',
          }}>
          {state.level}
        </span>
      )}
    </div>
  );
}
