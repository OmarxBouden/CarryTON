'use client';
import { useState, useEffect, useCallback } from 'react';
import { getTonPrice } from './api';

const REFETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useTonPrice() {
  const [tonUsd, setTonUsd] = useState(2.80);
  const [tonEur, setTonEur] = useState(2.60);
  const [tonChf, setTonChf] = useState(2.50);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const data = await getTonPrice();
      setTonUsd(data.ton_usd);
      setTonEur(data.ton_eur);
      setTonChf(data.ton_chf);
    } catch {
      // keep fallback values
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, REFETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetch]);

  const formatTon = useCallback(
    (amount: number, currency: 'CHF' | 'EUR' | 'USD' = 'CHF'): string => {
      const rates = { CHF: tonChf, EUR: tonEur, USD: tonUsd };
      const symbols = { CHF: 'CHF', EUR: '€', USD: '$' };
      const fiat = (amount * rates[currency]).toFixed(2);
      return `${amount.toFixed(2)} TON (~${symbols[currency]} ${fiat})`;
    },
    [tonUsd, tonEur, tonChf]
  );

  return { tonUsd, tonEur, tonChf, loading, formatTon };
}
