import { Router, Request, Response } from 'express';
import { PriceDisplay } from '../../../shared/types';

const router = Router();

const FALLBACK = { ton_usd: 2.80, ton_eur: 2.60, ton_chf: 2.50 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cache: { ton_usd: number; ton_eur: number; ton_chf: number; updated_at: string } | null = null;
let cacheTimestamp = 0;

async function fetchTonPrice(): Promise<{ ton_usd: number; ton_eur: number; ton_chf: number }> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd,eur,chf'
    );
    if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
    const data = await res.json() as any;
    const ton = data?.['the-open-network'];
    if (!ton || !ton.usd || !ton.eur || !ton.chf) throw new Error('Unexpected CoinGecko response format');
    return { ton_usd: ton.usd, ton_eur: ton.eur, ton_chf: ton.chf };
  } catch (err) {
    console.warn('[price] CoinGecko unavailable, using fallback prices:', err);
    return FALLBACK;
  }
}

async function getCachedPrice() {
  if (cache && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cache;
  }
  const prices = await fetchTonPrice();
  cache = { ...prices, updated_at: new Date().toISOString() };
  cacheTimestamp = Date.now();
  return cache;
}

// GET /price/ton
router.get('/ton', async (_req: Request, res: Response) => {
  const prices = await getCachedPrice();
  return res.json(prices);
});

// Helper: convertTonToFiat
export async function convertTonToFiat(ton_amount: number, currency: 'CHF' | 'EUR' | 'USD' = 'CHF'): Promise<PriceDisplay> {
  const prices = await getCachedPrice();

  const rateMap = { CHF: prices.ton_chf, EUR: prices.ton_eur, USD: prices.ton_usd };
  const symbolMap = { CHF: 'CHF', EUR: '€', USD: '$' };

  const fiat_amount = Math.round(ton_amount * rateMap[currency] * 100) / 100;
  const fiat_symbol = symbolMap[currency];

  return {
    ton: ton_amount,
    fiat_amount,
    fiat_currency: currency,
    fiat_symbol,
    display: `${ton_amount.toFixed(2)} TON (~${fiat_symbol} ${fiat_amount.toFixed(2)})`,
  };
}

export default router;
