'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/providers/AppProvider';
import { ANIMAL_AVATARS } from '../../../../shared/types';
import { AnimalSvg } from '@/components/AnimalAvatar';
import { useToast } from '@/components/Toast';
import api from '@/lib/api';

export default function AvatarSelectPage() {
  const router = useRouter();
  const { user, refreshUser } = useApp();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<string | null>(user?.avatar_id || null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!selected || !user) return;
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, { avatar_id: selected });
      await refreshUser();
      showToast('Avatar saved!', 'success');
      setTimeout(() => router.push('/profile'), 800);
    } catch {
      showToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen anim-in" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3 flex items-center gap-3"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full cursor-pointer"
          style={{ color: 'var(--text-2)' }} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-5 h-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Choose your avatar</h1>
      </div>

      <div className="px-4 py-6 pb-24">
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-2)' }}>
          Pick a travel animal that represents your delivery style
        </p>

        {/* Animal grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {ANIMAL_AVATARS.map((animal) => {
            const isSelected = selected === animal.id;
            return (
              <button key={animal.id} onClick={() => setSelected(animal.id)}
                className="flex flex-col items-center p-5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.97]"
                style={{
                  background: isSelected ? animal.bg : 'var(--surface)',
                  borderColor: isSelected ? animal.color : 'var(--border)',
                  boxShadow: isSelected ? `0 4px 16px ${animal.color}33` : 'none',
                }}>
                {/* Animal SVG */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ background: isSelected ? `${animal.color}18` : 'var(--surface-2, #f7f8fa)' }}>
                  <AnimalSvg id={animal.id} size={44} color={animal.color} />
                </div>
                {/* Name */}
                <p className="text-sm font-bold" style={{ color: isSelected ? animal.color : 'var(--text-1)' }}>
                  {animal.name}
                </p>
                {/* Description */}
                <p className="text-[11px] mt-0.5 text-center" style={{ color: 'var(--text-3)' }}>
                  {animal.desc}
                </p>

                {/* Checkmark */}
                {isSelected && (
                  <div className="mt-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: animal.color }}>
                    <svg width={12} height={12} viewBox="0 0 20 20" fill="#fff">
                      <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={!selected || saving}
          className="w-full py-4 rounded-2xl text-base font-bold cursor-pointer transition-all active:scale-[0.98] disabled:opacity-40"
          style={{
            background: selected ? ANIMAL_AVATARS.find(a => a.id === selected)?.color || 'var(--accent)' : 'var(--text-3)',
            color: '#fff',
            boxShadow: selected ? `0 4px 16px ${ANIMAL_AVATARS.find(a => a.id === selected)?.color || '#2AABEE'}44` : 'none',
          }}>
          {saving ? 'Saving...' : selected ? `Continue as ${ANIMAL_AVATARS.find(a => a.id === selected)?.name}` : 'Pick an avatar'}
        </button>
      </div>
    </div>
  );
}
