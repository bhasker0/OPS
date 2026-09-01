import React from 'react';
import { Sun, Moon, Zap, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme, scanlines, toggleScanlines } = useTheme();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '2px',
        gap: '2px',
      }}
    >
      <button
        type="button"
        onClick={() => setTheme('light')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.55rem',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: theme === 'light' ? 'var(--bg-surface)' : 'transparent',
          color: theme === 'light' ? 'var(--text-main)' : 'var(--text-muted)',
          boxShadow: theme === 'light' ? 'var(--shadow-card)' : 'none',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-sans)',
          fontWeight: theme === 'light' ? 600 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Editorial Light Mode"
      >
        <Sun size={13} />
        <span>Light</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.55rem',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: theme === 'dark' ? 'var(--bg-surface)' : 'transparent',
          color: theme === 'dark' ? 'var(--text-main)' : 'var(--text-muted)',
          boxShadow: theme === 'dark' ? 'var(--shadow-card)' : 'none',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-sans)',
          fontWeight: theme === 'dark' ? 600 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Tinted Charcoal Dark Mode"
      >
        <Moon size={13} />
        <span>Dark</span>
      </button>

      <button
        type="button"
        onClick={() => setTheme('high-contrast')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.55rem',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: theme === 'high-contrast' ? 'var(--primary)' : 'transparent',
          color: theme === 'high-contrast' ? '#ffffff' : 'var(--text-muted)',
          boxShadow: theme === 'high-contrast' ? 'var(--shadow-card)' : 'none',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-sans)',
          fontWeight: theme === 'high-contrast' ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="High Contrast Orange/Amber Mode"
      >
        <Zap size={13} />
        <span>Amber</span>
      </button>

      <button
        type="button"
        onClick={toggleScanlines}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.55rem',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          background: scanlines ? 'var(--accent-blue-bg)' : 'transparent',
          color: scanlines ? 'var(--accent-blue)' : 'var(--text-muted)',
          fontSize: '0.75rem',
          fontFamily: 'var(--font-sans)',
          fontWeight: scanlines ? 600 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Toggle Retro CRT Shader"
      >
        <Monitor size={13} />
        <span>CRT</span>
      </button>
    </div>
  );
}
