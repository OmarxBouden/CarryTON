interface EmptyStateProps {
  icon: 'package' | 'truck' | 'inbox' | 'search' | 'map';
  title: string; description: string; actionLabel?: string; onAction?: () => void;
}

function EmptyIcon({ type }: { type: EmptyStateProps['icon'] }) {
  const p = { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--blue)', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (type) {
    case 'package': return <svg {...p}><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
    case 'truck': return <svg {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    case 'inbox': return <svg {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>;
    case 'search': return <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'map': return <svg {...p}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>;
  }
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5" style={{ background: 'var(--blue-light)' }}>
        <EmptyIcon type={icon} />
      </div>
      <p className="heading text-[16px] mb-1">{title}</p>
      <p className="text-[14px] max-w-[260px] mb-5" style={{ color: 'var(--text-2)' }}>{description}</p>
      {actionLabel && onAction && <button onClick={onAction} className="btn btn-blue text-[14px]">{actionLabel}</button>}
    </div>
  );
}
