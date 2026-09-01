import React from 'react';

export default function TableDensityControl({ density = 'standard', onDensityChange }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--border)',
        background: 'var(--bg-canvas)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.68rem',
      }}
    >
      <button
        type="button"
        onClick={() => onDensityChange('compact')}
        style={{
          padding: '0.2rem 0.45rem',
          border: 'none',
          background: density === 'compact' ? 'var(--primary)' : 'transparent',
          color: density === 'compact' ? '#fff' : 'var(--text-muted)',
          fontSize: '0.68rem',
          fontWeight: 800,
          cursor: 'pointer',
          borderRight: '1px solid var(--border)',
          transition: 'all 0.1s ease',
          fontFamily: 'var(--font-mono)'
        }}
        title="Compact Density (High row density)"
      >
        [COMPACT]
      </button>
      <button
        type="button"
        onClick={() => onDensityChange('standard')}
        style={{
          padding: '0.2rem 0.45rem',
          border: 'none',
          background: density === 'standard' ? 'var(--primary)' : 'transparent',
          color: density === 'standard' ? '#fff' : 'var(--text-muted)',
          fontSize: '0.68rem',
          fontWeight: 800,
          cursor: 'pointer',
          borderRight: '1px solid var(--border)',
          transition: 'all 0.1s ease',
          fontFamily: 'var(--font-mono)'
        }}
        title="Standard Density"
      >
        [STANDARD]
      </button>
      <button
        type="button"
        onClick={() => onDensityChange('comfortable')}
        style={{
          padding: '0.2rem 0.45rem',
          border: 'none',
          background: density === 'comfortable' ? 'var(--primary)' : 'transparent',
          color: density === 'comfortable' ? '#fff' : 'var(--text-muted)',
          fontSize: '0.68rem',
          fontWeight: 800,
          cursor: 'pointer',
          transition: 'all 0.1s ease',
          fontFamily: 'var(--font-mono)'
        }}
        title="Comfortable Density"
      >
        [COZY]
      </button>
    </div>
  );
}

