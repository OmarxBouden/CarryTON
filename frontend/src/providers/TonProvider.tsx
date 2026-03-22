'use client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

export function TonProvider({ children }: { children: React.ReactNode }) {
  const manifestUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tonconnect-manifest.json`
    : '';

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      {children}
    </TonConnectUIProvider>
  );
}
