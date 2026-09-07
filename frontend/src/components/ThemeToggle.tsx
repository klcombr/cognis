import { useEffect, useState } from 'react';

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem('cognis_dark');
    if (stored !== null) return stored === '1';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  } catch {
    return false;
  }
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(getInitialDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('cognis_dark', dark ? '1' : '0'); } catch {}
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      aria-label="toggle dark mode"
      title="tema"
      className={`w-8 h-8 rounded-sm border-2 border-text flex items-center justify-center shrink-0 transition-all hover:shadow-[3px_3px_0_#111] active:shadow-[1px_1px_0_#111] active:translate-x-[2px] active:translate-y-[2px] ${
        dark ? 'bg-text text-white' : 'bg-white text-text shadow-[2px_2px_0_#555]'
      }`}
    >
      {dark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" fill="currentColor" stroke="none" />
        </svg>
      )}
    </button>
  );
}