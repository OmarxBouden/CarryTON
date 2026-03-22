'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Home', paths: [
    'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
    'M9 22V12h6v10',
  ]},
  { href: '/trip/new', label: 'Post', paths: [
    'M12 5v14',
    'M5 12h14',
  ]},
  { href: '/request/new', label: 'Send', paths: [
    'M22 2L11 13',
    'M22 2l-7 20-4-9-9-4z',
  ]},
  { href: '/active', label: 'Active', paths: [
    'M22 12h-4l-3 9L9 3l-3 9H2',
  ]},
  { href: '/profile', label: 'Me', paths: [
    'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2',
    'M12 3a4 4 0 110 8 4 4 0 010-8z',
  ]},
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe"
      style={{ background: 'var(--glass)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid var(--glass-border)' }}>
      <div className="flex items-center justify-around h-[56px]">
        {tabs.map(tab => {
          const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href}
              className="flex flex-col items-center justify-center gap-[2px] w-[56px] h-[44px] cursor-pointer relative">
              <div className="relative">
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none"
                  stroke={active ? 'var(--accent)' : 'var(--text-3)'}
                  strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round"
                  style={{ transition: 'stroke 150ms' }}>
                  {tab.paths.map((d, i) => <path key={i} d={d} />)}
                </svg>
                {active && (
                  <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] rounded-full"
                    style={{ background: 'var(--accent)' }} />
                )}
              </div>
              <span className="text-[10px] font-bold"
                style={{ color: active ? 'var(--accent)' : 'var(--text-3)', transition: 'color 150ms' }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
