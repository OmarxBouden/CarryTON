'use client';
import React from 'react';
import { ANIMAL_AVATARS } from '../../../shared/types';
import { AnimalSvg } from './AnimalAvatar';

export type AnimalMood = 'sleeping' | 'idle' | 'listening' | 'thinking' | 'happy' | 'sad';

interface AnimatedAnimalProps {
  animalId: string;
  mood: AnimalMood;
  size?: number;
}

const ANIMAL_NAMES: Record<string, string> = {
  fox: 'Foxy', bear: 'Bruno', falcon: 'Flash',
  turtle: 'Shelly', cat: 'Whiskers', goat: 'Rocky',
};

export function getAnimalName(id: string): string {
  return ANIMAL_NAMES[id] || 'Buddy';
}

export function AnimatedAnimal({ animalId, mood, size = 120 }: AnimatedAnimalProps) {
  const config = ANIMAL_AVATARS.find(a => a.id === animalId);
  const color = config?.color || '#2AABEE';
  const bg = config?.bg || '#E8F7FE';

  // Mood-based CSS classes
  const moodClass =
    mood === 'sleeping' ? 'animal-sleeping' :
    mood === 'listening' ? 'animal-listening' :
    mood === 'thinking' ? 'animal-thinking' :
    mood === 'happy' ? 'animal-happy' :
    mood === 'sad' ? 'animal-sad' :
    'animal-idle';

  return (
    <div className="relative flex flex-col items-center">
      {/* Glow ring behind animal */}
      <div className="absolute rounded-full"
        style={{
          width: size * 1.3, height: size * 1.3,
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          opacity: mood === 'listening' ? 1 : mood === 'sleeping' ? 0.3 : 0.5,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Pulse rings when listening */}
      {mood === 'listening' && (
        <>
          <div className="absolute rounded-full anim-pulse"
            style={{ width: size * 0.9, height: size * 0.9, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: `2px solid ${color}`, opacity: 0.3 }} />
          <div className="absolute rounded-full anim-pulse"
            style={{ width: size * 0.9, height: size * 0.9, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: `2px solid ${color}`, opacity: 0.2, animationDelay: '0.5s' }} />
        </>
      )}

      {/* Animal container */}
      <div className={`relative ${moodClass}`}
        style={{ width: size, height: size }}>

        {/* The animal SVG */}
        <div className="absolute inset-0 flex items-center justify-center animal-body">
          <div className="rounded-full flex items-center justify-center"
            style={{
              width: size * 0.85, height: size * 0.85,
              background: bg,
              boxShadow: mood === 'happy' ? `0 0 30px ${color}44` : 'none',
              transition: 'box-shadow 300ms ease',
            }}>
            <AnimalSvg id={animalId} size={size * 0.6} color={color} />
          </div>
        </div>

        {/* Sleep Zs */}
        {mood === 'sleeping' && (
          <div className="absolute -top-2 -right-1">
            <span className="animal-z text-lg font-bold" style={{ color, opacity: 0.6 }}>z</span>
            <span className="animal-z animal-z-2 text-sm font-bold absolute -top-3 left-3" style={{ color, opacity: 0.4 }}>z</span>
            <span className="animal-z animal-z-3 text-xs font-bold absolute -top-5 left-1" style={{ color, opacity: 0.3 }}>z</span>
          </div>
        )}

        {/* Thinking dots */}
        {mood === 'thinking' && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            <span className="thinking-dot" style={{ background: color, width: 6, height: 6, borderRadius: '50%' }} />
            <span className="thinking-dot thinking-dot-2" style={{ background: color, width: 6, height: 6, borderRadius: '50%' }} />
            <span className="thinking-dot thinking-dot-3" style={{ background: color, width: 6, height: 6, borderRadius: '50%' }} />
          </div>
        )}

        {/* Happy stars */}
        {mood === 'happy' && (
          <>
            <span className="happy-star absolute -top-1 -left-1 text-sm" style={{ color }}>✦</span>
            <span className="happy-star happy-star-2 absolute -top-2 -right-2 text-xs" style={{ color }}>✦</span>
            <span className="happy-star happy-star-3 absolute top-0 right-0 text-[10px]" style={{ color }}>✦</span>
          </>
        )}
      </div>

      {/* CSS animations — all inline to avoid globals dependency */}
      <style>{`
        .animal-idle .animal-body {
          animation: animalBreathe 3s ease-in-out infinite;
        }
        .animal-sleeping .animal-body {
          animation: animalBreathe 4s ease-in-out infinite;
          opacity: 0.7;
          filter: brightness(0.85);
        }
        .animal-listening .animal-body {
          animation: animalPerk 0.6s ease-out forwards;
        }
        .animal-thinking .animal-body {
          animation: animalLookAround 2s ease-in-out infinite;
        }
        .animal-happy .animal-body {
          animation: animalBounce 0.5s cubic-bezier(.34,1.56,.64,1);
        }
        .animal-sad .animal-body {
          animation: animalDroop 0.5s ease-out forwards;
        }

        @keyframes animalBreathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.03) translateY(-2px); }
        }
        @keyframes animalPerk {
          0% { transform: scale(1) translateY(0); }
          40% { transform: scale(1.08) translateY(-6px); }
          100% { transform: scale(1.05) translateY(-4px); }
        }
        @keyframes animalLookAround {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-2deg); }
          75% { transform: translateX(4px) rotate(2deg); }
        }
        @keyframes animalBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.15) translateY(-8px); }
          50% { transform: scale(0.95) translateY(2px); }
          70% { transform: scale(1.05) translateY(-3px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes animalDroop {
          0% { transform: translateY(0) rotate(0); }
          100% { transform: translateY(4px) rotate(-3deg); }
        }

        /* Floating Zs */
        .animal-z {
          display: inline-block;
          animation: floatZ 2s ease-in-out infinite;
        }
        .animal-z-2 { animation-delay: 0.6s; }
        .animal-z-3 { animation-delay: 1.2s; }
        @keyframes floatZ {
          0%, 100% { transform: translateY(0) rotate(0); opacity: 0.3; }
          50% { transform: translateY(-8px) rotate(10deg); opacity: 0.7; }
        }

        /* Thinking dots */
        .thinking-dot {
          animation: thinkPulse 1.2s ease-in-out infinite;
        }
        .thinking-dot-2 { animation-delay: 0.2s; }
        .thinking-dot-3 { animation-delay: 0.4s; }
        @keyframes thinkPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.4); opacity: 1; }
        }

        /* Happy stars */
        .happy-star {
          animation: starPop 0.8s cubic-bezier(.34,1.56,.64,1) both;
        }
        .happy-star-2 { animation-delay: 0.15s; }
        .happy-star-3 { animation-delay: 0.3s; }
        @keyframes starPop {
          0% { transform: scale(0) rotate(0); opacity: 0; }
          60% { transform: scale(1.3) rotate(20deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 0.7; }
        }

        @media (prefers-reduced-motion: reduce) {
          .animal-body, .animal-z, .thinking-dot, .happy-star {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
