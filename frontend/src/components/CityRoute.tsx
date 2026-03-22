interface CityRouteProps {
  from: string;
  to: string;
  departureTime?: string;
  carrierName?: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' });
}

export function CityRoute({ from, to, departureTime, carrierName }: CityRouteProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-0">
        {/* Origin: dot + label */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div
            className="w-[10px] h-[10px] rounded-full"
            style={{ background: 'var(--blue)', boxShadow: '0 0 0 3px var(--blue-light)' }}
          />
          <span className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>{from}</span>
        </div>

        {/* Connecting line */}
        <div className="flex-1 flex items-center mx-2 min-w-6">
          <div className="flex-1 h-[2px] rounded-full" style={{ background: 'var(--blue)', opacity: 0.25 }} />
          <svg width={16} height={10} viewBox="0 0 16 10" fill="var(--blue)" className="flex-shrink-0 -ml-px">
            <path d="M10 0l6 5-6 5V7H0V3h10V0z" opacity="0.5" />
          </svg>
        </div>

        {/* Destination: dot + label */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div
            className="w-[10px] h-[10px] rounded-full border-2"
            style={{ borderColor: 'var(--blue)', background: 'transparent' }}
          />
          <span className="text-[14px] font-bold" style={{ color: 'var(--text-1)' }}>{to}</span>
        </div>
      </div>

      {(departureTime || carrierName) && (
        <div className="flex items-center gap-3 ml-5 text-xs" style={{ color: 'var(--text-3)' }}>
          {departureTime && <span>{formatTime(departureTime)}</span>}
          {carrierName && <span>{carrierName}</span>}
        </div>
      )}
    </div>
  );
}
