'use client';
import { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface ToastMessage { id: number; text: string; type: ToastType; leaving: boolean; }
interface ToastContextValue { showToast: (text: string, type?: ToastType) => void; }
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });
export function useToast() { return useContext(ToastContext); }

function Icon({ type }: { type: ToastType }) {
  const c = "w-4 h-4 flex-shrink-0";
  if (type === 'success') return <svg className={c} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>;
  if (type === 'error') return <svg className={c} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>;
  return <svg className={c} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg>;
}

const bg: Record<ToastType, string> = { success: '#22C55E', error: '#EF4444', info: '#2563EB' };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);
  const showToast = useCallback((text: string, type: ToastType = 'info') => {
    const id = ++idRef.current;
    setToasts(p => [...p, { id, text, type, leaving: false }]);
    setTimeout(() => {
      setToasts(p => p.map(t => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 300);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[14px] font-semibold text-white ${t.leaving ? 'animate-slide-up' : 'animate-slide-down'}`}
            style={{ background: bg[t.type], boxShadow: `0 4px 20px ${bg[t.type]}44` }}>
            <Icon type={t.type} />{t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
