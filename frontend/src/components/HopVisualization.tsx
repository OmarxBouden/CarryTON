import type { AIHop } from '../../../shared/types';

interface HopVisualizationProps {
  hops: AIHop[];
  size?: 'sm' | 'md';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' });
}

export function HopVisualization({ hops, size = 'md' }: HopVisualizationProps) {
  if (hops.length === 0) return null;

  // Collect unique cities in order
  const cities: { name: string; type: 'start' | 'relay' | 'end' }[] = [];
  cities.push({ name: hops[0].from, type: 'start' });
  for (let i = 0; i < hops.length; i++) {
    if (i < hops.length - 1) {
      cities.push({ name: hops[i].to, type: 'relay' });
    } else {
      cities.push({ name: hops[i].to, type: 'end' });
    }
  }

  const dotSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const carrierTextSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <div className="w-full overflow-x-auto">
      {/* Horizontal layout */}
      <div className="flex items-start gap-0 min-w-0">
        {cities.map((city, i) => (
          <div key={`${city.name}-${i}`} className="flex items-start">
            {/* City column */}
            <div className="flex flex-col items-center flex-shrink-0">
              {/* Dot */}
              {city.type === 'relay' ? (
                <div className={`${dotSize} rounded-full border-2 border-purple-500 bg-purple-100 dark:bg-purple-900`} />
              ) : (
                <div className={`${dotSize} rounded-full bg-[#2AABEE]`} />
              )}
              {/* City name */}
              <span className={`${textSize} font-semibold text-gray-900 dark:text-white mt-1 whitespace-nowrap`}>
                {city.name}
              </span>
              {/* Relay label */}
              {city.type === 'relay' && (
                <span className="text-[10px] text-purple-500 font-medium">relay</span>
              )}
            </div>

            {/* Connector between cities */}
            {i < cities.length - 1 && (
              <div className="flex flex-col items-center flex-1 min-w-[80px] mx-1 pt-1.5">
                {/* Line + arrow */}
                <div className="flex items-center w-full">
                  <div className="flex-1 border-t-2 border-dashed border-[#2AABEE]" />
                  <svg className="w-3 h-3 text-[#2AABEE] flex-shrink-0 -ml-0.5" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M6.5 1.5l5 4.5-5 4.5V8H.5V4h6V1.5z" />
                  </svg>
                </div>
                {/* Carrier name under the line */}
                <span className={`${carrierTextSize} text-gray-500 dark:text-gray-400 mt-1 whitespace-nowrap truncate max-w-full text-center`}>
                  {hops[i].carrier_name}
                </span>
                {/* Departure time */}
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {formatTime(hops[i].departure_time)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
