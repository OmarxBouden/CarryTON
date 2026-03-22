'use client';
import { useTonPrice } from '@/lib/ton-price';

const TOKEN = 'BXC';

interface PriceTagProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showFiat?: boolean;
  currency?: 'CHF' | 'EUR' | 'USD';
  inline?: boolean;
}

const sizes = {
  sm: { ton: 'text-[13px] font-semibold', fiat: 'text-[11px]' },
  md: { ton: 'text-[15px] font-bold', fiat: 'text-[12px]' },
  lg: { ton: 'heading text-[20px]', fiat: 'text-[13px]' },
};

export function PriceTag({ amount, size = 'md', showFiat = true, currency = 'CHF', inline = false }: PriceTagProps) {
  const { tonUsd, tonEur, tonChf } = useTonPrice();
  const rates = { CHF: tonChf, EUR: tonEur, USD: tonUsd };
  const symbols = { CHF: 'CHF', EUR: '\u20AC', USD: '$' };
  const fiat = (amount * rates[currency]).toFixed(2);
  const s = sizes[size];

  if (inline) return (
    <span className="inline-flex items-baseline gap-1">
      <span className={s.ton} style={{ color: 'var(--text-1)' }}>
        {amount.toFixed(2)} <span style={{ color: 'var(--accent, #2AABEE)' }}>{TOKEN}</span>
      </span>
      {showFiat && <span className={s.fiat} style={{ color: 'var(--text-3)' }}>(~{symbols[currency]}{fiat})</span>}
    </span>
  );

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className={`${s.ton} inline-flex items-baseline gap-1`} style={{ color: 'var(--text-1)' }}>
        {amount.toFixed(2)} <span style={{ color: 'var(--accent, #2AABEE)' }}>{TOKEN}</span>
      </span>
      {showFiat && <span className={s.fiat} style={{ color: 'var(--text-3)' }}>~{symbols[currency]} {fiat}</span>}
    </span>
  );
}
