import React from 'react';
import { Sun, Moon, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
      <button
        type="button"
        onClick={() => setTheme('light')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.3rem 0.55rem',
          border: 'none',
          background: theme === 'light' ? 'var(--primary-light)' : 'transparent',
          color: theme === 'light' ? 'var(--primary)' : 'var(--text-muted)',
          fontSize: '0.74rem',
          fontWeight: theme === 'light' ? 700 : 500,
          cursor: 'pointer',
          borderRight: '1px solid var(--border)',
          transition: 'all 0.15s ease'
        }}
        title="Light Theme"
      >
        <Sun size={13} /> Light
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.3rem 0.55rem',
          border: 'none',
          background: theme === 'dark' ? 'var(--primary-light)' : 'transparent',
          color: theme === 'dark' ? 'var(--primary)' : 'var(--text-muted)',
          fontSize: '0.74rem',
          fontWeight: theme === 'dark' ? 700 : 500,
          cursor: 'pointer',
          borderRight: '1px solid var(--border)',
          transition: 'all 0.15s ease'
        }}
        title="Dark Theme (Night Shift)"
      >
        <Moon size={13} /> Dark
      </button>
      <button
        type="button"
        onClick={() => setTheme('high-contrast')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.3rem 0.55rem',
          border: 'none',
          background: theme === 'high-contrast' ? 'var(--primary-light)' : 'transparent',
          color: theme === 'high-contrast' ? 'var(--primary)' : 'var(--text-muted)',
          fontSize: '0.74rem',
          fontWeight: theme === 'high-contrast' ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        title="High-Contrast Factory Floor Theme"
      >
        <Zap size={13} /> Factory High-Contrast
      </button>
    </div>
  );
}
