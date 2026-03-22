/**
 * Travel Animal SVG avatars.
 * Each animal is a simple, recognizable silhouette that works at any size.
 */
import React from 'react';

interface AnimalSvgProps {
  size: number;
  color: string;
}

function Fox({ size, color }: AnimalSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Ears */}
      <path d="M7 4L4 14h6L7 4z" fill={color} opacity=".8"/>
      <path d="M25 4l3 10h-6l3-10z" fill={color} opacity=".8"/>
      {/* Head */}
      <ellipse cx="16" cy="18" rx="10" ry="9" fill={color}/>
      {/* Eyes */}
      <circle cx="12" cy="16" r="1.5" fill="#fff"/>
      <circle cx="20" cy="16" r="1.5" fill="#fff"/>
      <circle cx="12.5" cy="16" r=".7" fill="#1a1a2e"/>
      <circle cx="20.5" cy="16" r=".7" fill="#1a1a2e"/>
      {/* Nose */}
      <ellipse cx="16" cy="21" rx="2" ry="1.2" fill="#1a1a2e"/>
      {/* Cheeks */}
      <circle cx="10" cy="20" r="2" fill={color} opacity=".5" filter="url(#none)"/>
      <circle cx="22" cy="20" r="2" fill={color} opacity=".5"/>
    </svg>
  );
}

function Bear({ size, color }: AnimalSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Ears */}
      <circle cx="7" cy="8" r="4" fill={color}/>
      <circle cx="25" cy="8" r="4" fill={color}/>
      <circle cx="7" cy="8" r="2" fill={color} opacity=".5"/>
      <circle cx="25" cy="8" r="2" fill={color} opacity=".5"/>
      {/* Head */}
      <ellipse cx="16" cy="18" rx="11" ry="10" fill={color}/>
      {/* Muzzle */}
      <ellipse cx="16" cy="21" rx="5" ry="4" fill="#fff" opacity=".3"/>
      {/* Eyes */}
      <circle cx="11" cy="16" r="1.5" fill="#1a1a2e"/>
      <circle cx="21" cy="16" r="1.5" fill="#1a1a2e"/>
      {/* Nose */}
      <ellipse cx="16" cy="20" rx="2.5" ry="1.5" fill="#1a1a2e"/>
    </svg>
  );
}

function Falcon({ size, color }: AnimalSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Head */}
      <ellipse cx="16" cy="16" rx="9" ry="10" fill={color}/>
      {/* Head tuft */}
      <path d="M16 3l-2 6h4l-2-6z" fill={color} opacity=".8"/>
      {/* Eyes */}
      <ellipse cx="12" cy="14" rx="2.5" ry="2" fill="#fff"/>
      <ellipse cx="20" cy="14" rx="2.5" ry="2" fill="#fff"/>
      <circle cx="12.5" cy="14" r="1" fill="#1a1a2e"/>
      <circle cx="20.5" cy="14" r="1" fill="#1a1a2e"/>
      {/* Beak */}
      <path d="M14 19l2 5 2-5h-4z" fill="#FFB547"/>
      {/* Eye marks */}
      <path d="M9 14c0-2 2-4 3-4" stroke="#1a1a2e" strokeWidth=".8" fill="none"/>
      <path d="M23 14c0-2-2-4-3-4" stroke="#1a1a2e" strokeWidth=".8" fill="none"/>
    </svg>
  );
}

function Turtle({ size, color }: AnimalSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Shell */}
      <ellipse cx="16" cy="18" rx="12" ry="9" fill={color}/>
      <ellipse cx="16" cy="18" rx="8" ry="6" fill={color} opacity=".6"/>
      {/* Shell pattern */}
      <path d="M12 14v8M16 13v10M20 14v8" stroke="#fff" strokeWidth=".7" opacity=".3"/>
      {/* Head */}
      <ellipse cx="16" cy="9" rx="5" ry="4" fill={color} opacity=".8"/>
      {/* Eyes */}
      <circle cx="14" cy="8" r="1.2" fill="#fff"/>
      <circle cx="18" cy="8" r="1.2" fill="#fff"/>
      <circle cx="14.3" cy="8" r=".5" fill="#1a1a2e"/>
      <circle cx="18.3" cy="8" r=".5" fill="#1a1a2e"/>
      {/* Smile */}
      <path d="M14 11c1 1 3 1 4 0" stroke="#1a1a2e" strokeWidth=".7" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function Cat({ size, color }: AnimalSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Ears */}
      <path d="M6 5l1 10 5-5-6-5z" fill={color}/>
      <path d="M26 5l-1 10-5-5 6-5z" fill={color}/>
      <path d="M7 6l1 7 3-3-4-4z" fill={color} opacity=".5"/>
      <path d="M25 6l-1 7-3-3 4-4z" fill={color} opacity=".5"/>
      {/* Head */}
      <ellipse cx="16" cy="18" rx="10" ry="9" fill={color}/>
      {/* Eyes — cat-like slits */}
      <ellipse cx="12" cy="16" rx="2" ry="2.5" fill="#fff"/>
      <ellipse cx="20" cy="16" rx="2" ry="2.5" fill="#fff"/>
      <ellipse cx="12" cy="16" rx=".7" ry="2" fill="#1a1a2e"/>
      <ellipse cx="20" cy="16" rx=".7" ry="2" fill="#1a1a2e"/>
      {/* Nose */}
      <path d="M15 20l1 1.5 1-1.5h-2z" fill="#FF9ECD"/>
      {/* Whiskers */}
      <line x1="4" y1="19" x2="11" y2="20" stroke="#fff" strokeWidth=".5" opacity=".4"/>
      <line x1="4" y1="21" x2="11" y2="21" stroke="#fff" strokeWidth=".5" opacity=".4"/>
      <line x1="28" y1="19" x2="21" y2="20" stroke="#fff" strokeWidth=".5" opacity=".4"/>
      <line x1="28" y1="21" x2="21" y2="21" stroke="#fff" strokeWidth=".5" opacity=".4"/>
    </svg>
  );
}

function Goat({ size, color }: AnimalSvgProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* Horns */}
      <path d="M9 4c-3 2-4 6-2 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M23 4c3 2 4 6 2 8" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {/* Head */}
      <ellipse cx="16" cy="18" rx="9" ry="10" fill={color}/>
      {/* Eyes */}
      <ellipse cx="12" cy="15" rx="1.5" ry="1.8" fill="#fff"/>
      <ellipse cx="20" cy="15" rx="1.5" ry="1.8" fill="#fff"/>
      {/* Horizontal pupils (goat-like!) */}
      <ellipse cx="12" cy="15" rx="1.2" ry=".5" fill="#1a1a2e"/>
      <ellipse cx="20" cy="15" rx="1.2" ry=".5" fill="#1a1a2e"/>
      {/* Beard */}
      <path d="M14 25c1 3 3 3 4 0" fill={color} opacity=".6"/>
      {/* Nose */}
      <ellipse cx="16" cy="21" rx="3" ry="2" fill={color} opacity=".5"/>
      <circle cx="14.5" cy="20.5" r=".7" fill="#1a1a2e"/>
      <circle cx="17.5" cy="20.5" r=".7" fill="#1a1a2e"/>
    </svg>
  );
}

const ANIMAL_MAP: Record<string, (props: AnimalSvgProps) => React.ReactElement> = {
  fox: Fox, bear: Bear, falcon: Falcon, turtle: Turtle, cat: Cat, goat: Goat,
};

export function AnimalSvg({ id, size, color }: { id: string; size: number; color: string }) {
  const Component = ANIMAL_MAP[id];
  if (!Component) return null;
  return <Component size={size} color={color} />;
}
