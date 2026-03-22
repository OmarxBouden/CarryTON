'use client';
import { useState } from 'react';
import { useVoice } from '@/lib/use-voice';
import { parseVoice, type VoiceParseResult } from '@/lib/api';
import { useToast } from './Toast';
import { useApp } from '@/providers/AppProvider';
import { AnimatedAnimal, getAnimalName, type AnimalMood } from './AnimatedAnimal';

interface VoiceOverlayProps {
  onResult: (result: VoiceParseResult) => void;
  onClose: () => void;
}

export function VoiceOverlay({ onResult, onClose }: VoiceOverlayProps) {
  const { isSupported, isListening, transcript, start, stop, reset, error } = useVoice();
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<VoiceParseResult | null>(null);
  const { showToast } = useToast();
  const { user } = useApp();

  const animalId = user?.avatar_id || 'falcon';
  const animalName = getAnimalName(animalId);

  // Determine animal mood
  let mood: AnimalMood = 'sleeping';
  if (parsed) mood = parsed.from_city && parsed.to_city ? 'happy' : 'sad';
  else if (parsing) mood = 'thinking';
  else if (isListening) mood = 'listening';
  else if (transcript) mood = 'idle';

  async function handleDone() {
    if (!transcript.trim()) return;
    stop();
    setParsing(true);
    try {
      const result = await parseVoice(transcript.trim());
      setParsed(result);
    } catch {
      showToast('Could not parse. Try again.', 'error');
    } finally {
      setParsing(false);
    }
  }

  function handleConfirm() {
    if (parsed) { onResult(parsed); onClose(); }
  }

  function handleRetry() {
    setParsed(null);
    setParsing(false);
    reset();
  }

  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
        style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }}>
        <div className="card p-6 max-w-sm w-full text-center">
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Voice not supported</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>Your browser doesn&apos;t support speech recognition.</p>
          <button onClick={onClose} className="btn btn-accent text-sm w-full">Got it</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(16px)' }}>

      {/* Close button */}
      <div className="flex justify-end p-4">
        <button onClick={() => { stop(); onClose(); }}
          className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
          style={{ background: 'rgba(255,255,255,.08)' }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">

        {/* ── Parsed result ── */}
        {parsed ? (
          <div className="w-full max-w-sm anim-in flex flex-col items-center">
            <AnimatedAnimal animalId={animalId} mood={mood} size={100} />
            <p className="text-white text-sm font-semibold mt-4 mb-4">
              {parsed.from_city && parsed.to_city
                ? `${animalName} found your route!`
                : `${animalName} needs a bit more info...`}
            </p>
            <div className="card p-4 w-full flex flex-col gap-3">
              {parsed.from_city && parsed.to_city && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
                  <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                    {parsed.from_city} → {parsed.to_city}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {parsed.package_size && (
                  <span className="tag" style={{ background: 'var(--accent-bg)', color: 'var(--accent)' }}>{parsed.package_size}</span>
                )}
                {parsed.urgency === 'urgent' && (
                  <span className="tag" style={{ background: 'var(--coral-bg)', color: 'var(--coral)' }}>urgent</span>
                )}
                {parsed.is_errand && (
                  <span className="tag" style={{ background: 'var(--violet-bg)', color: 'var(--violet)' }}>errand</span>
                )}
                {parsed.budget_ton != null && (
                  <span className="tag" style={{ background: 'var(--mint-bg)', color: 'var(--mint)' }}>{parsed.budget_ton} BXC</span>
                )}
              </div>
              {parsed.package_desc && (
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>{parsed.package_desc}</p>
              )}
              {parsed.clarification && (
                <div className="rounded-lg p-2.5" style={{ background: 'var(--amber-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--amber)' }}>{parsed.clarification}</p>
                </div>
              )}
              {(!parsed.from_city || !parsed.to_city) && (
                <div className="rounded-lg p-2.5" style={{ background: 'var(--coral-bg)' }}>
                  <p className="text-xs" style={{ color: 'var(--coral)' }}>
                    {!parsed.from_city && !parsed.to_city ? 'Could not detect cities.' :
                     !parsed.from_city ? 'Missing origin city.' : 'Missing destination.'}
                    {' '}You can edit after confirming.
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-4 w-full">
              <button onClick={handleRetry} className="btn btn-ghost flex-1 text-sm text-white" style={{ borderColor: 'rgba(255,255,255,.15)' }}>
                Try again
              </button>
              <button onClick={handleConfirm} className="btn btn-accent flex-1 text-sm">
                Use this
              </button>
            </div>
          </div>
        ) : (
          /* ── Listening / idle state ── */
          <>
            {/* The animated animal */}
            <AnimatedAnimal animalId={animalId} mood={mood} size={130} />

            {/* Tap prompt / status */}
            <p className="text-white text-base font-bold mt-5 mb-1">
              {parsing ? `${animalName} is thinking...`
               : isListening ? `${animalName} is listening...`
               : `Wake up ${animalName}`}
            </p>
            <p className="text-white/40 text-xs text-center max-w-xs mb-6">
              {isListening
                ? 'Describe your delivery. Tap the button when done.'
                : parsing
                  ? 'Parsing your request...'
                  : `Tap ${animalName} and say what you need`}
            </p>

            {/* Action button */}
            <button onClick={isListening ? handleDone : start}
              className="px-8 py-3.5 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-95"
              style={{
                background: isListening ? 'var(--coral)' : 'var(--accent)',
                color: '#fff',
                boxShadow: isListening ? '0 0 30px rgba(255,107,107,.3)' : '0 0 24px rgba(42,171,238,.3)',
              }}>
              {isListening ? (
                <span className="flex items-center gap-2">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="#fff"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  Done
                </span>
              ) : parsing ? (
                <span className="flex items-center gap-2">
                  <svg className="anim-spin" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                  Thinking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  </svg>
                  Talk to {animalName}
                </span>
              )}
            </button>

            {/* Live transcript */}
            {transcript && (
              <div className="w-full max-w-sm rounded-2xl p-4 mt-5 anim-in" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)' }}>
                <p className="text-white/80 text-sm leading-relaxed">&ldquo;{transcript}&rdquo;</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="w-full max-w-sm rounded-xl p-3 mt-3" style={{ background: 'var(--coral-bg)' }}>
                <p className="text-xs" style={{ color: 'var(--coral)' }}>{error}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
