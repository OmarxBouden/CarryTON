'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../../../shared/types';
import { getUser } from '../lib/api';
import { getTelegramUser, initTelegramApp, getTelegramTheme } from '../lib/telegram';
import { useTonPrice } from '../lib/ton-price';
import { TonProvider } from './TonProvider';
import { ToastProvider } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppContextValue {
  user: User | null;
  loading: boolean;
  tonPrice: { ton_usd: number; ton_eur: number; ton_chf: number };
  formatTon: (amount: number, currency?: 'CHF' | 'EUR' | 'USD') => string;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextValue>({
  user: null,
  loading: true,
  tonPrice: { ton_usd: 2.80, ton_eur: 2.60, ton_chf: 2.50 },
  formatTon: (amount) => `${amount.toFixed(2)} BXC`,
  refreshUser: async () => {},
});

export function useApp() {
  return useContext(AppContext);
}

// Fallback user for development outside Telegram
const DEV_FALLBACK = { id: 'tg_bob', username: 'bob_sends', first_name: 'Bob', last_name: 'W.' };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { tonUsd, tonEur, tonChf, formatTon } = useTonPrice();

  const fetchUser = useCallback(async () => {
    try {
      const tgUser = getTelegramUser() || DEV_FALLBACK;
      const telegramId = tgUser.id ? String(tgUser.id) : tgUser.id;
      const fetched = await getUser(telegramId as string);
      setUser(fetched);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initTelegramApp();
    fetchUser();

    // Apply dark mode based on Telegram theme or system preference
    const theme = getTelegramTheme();
    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [fetchUser]);

  return (
    <AppContext.Provider
      value={{
        user,
        loading,
        tonPrice: { ton_usd: tonUsd, ton_eur: tonEur, ton_chf: tonChf },
        formatTon,
        refreshUser: fetchUser,
      }}
    >
      <TonProvider>
        <ErrorBoundary>
          <ToastProvider>{children}</ToastProvider>
        </ErrorBoundary>
      </TonProvider>
    </AppContext.Provider>
  );
}
