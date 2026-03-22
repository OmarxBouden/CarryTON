interface XPProgressBarProps { current: number; max: number; level: number; levelName: string; }

export function XPProgressBar({ current, max, level, levelName }: XPProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Level {level} · {levelName}</span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>{current}/{max} XP</span>
      </div>
      <div className="h-[6px] rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--blue)', transition: 'width 600ms ease' }} />
      </div>
      <p className="text-[11px] mt-1 text-right font-medium" style={{ color: 'var(--text-3)' }}>{pct}% to Level {level + 1}</p>
    </div>
  );
}
