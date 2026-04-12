'use client';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('wl_theme');
    const isLight = saved === 'light';
    setLight(isLight);
    const html = document.documentElement;
    if (isLight) html.classList.remove('dark');
    else html.classList.add('dark');
  }, []);

  function toggle() {
    const next = !light;
    setLight(next);
    const html = document.documentElement;
    if (next) html.classList.remove('dark');
    else html.classList.add('dark');
    localStorage.setItem('wl_theme', next ? 'light' : 'dark');
  }

  return (
    <button
      onClick={toggle}
      title="Toggle theme"
      className="fixed bottom-4 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center text-base cursor-pointer transition-all hover:scale-110"
      style={{ background: 'var(--surface, #1e293b)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
    >
      {light ? '🌙' : '☀️'}
    </button>
  );
}
