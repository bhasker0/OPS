import React from 'react';
import { AlignJustify, ListFilter, Sliders } from 'lucide-react';

export default function TableDensityControl({ density = 'standard', onDensityChange }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', background: 'var(--bg-surface)' }}>
      <button
        type="button"
        onClick={() => onDensityChange('compact')}
        style={{
          padding: '0.25rem 0.5rem',
          border: 'none',
          background: density === 'compact' ? 'var(--primary-light)' : 'transparent',
          color: density === 'compact' ? 'var(--primary)' : 'var(--text-muted)',
          fontSize: '0.72rem',
          fontWeight: density === 'compact' ? 700 : 500,
          cursor: 'pointer',
          borderRight: '1px solid var(--border)',
          transition: 'all 0.15s ease'
        }}
        title="Compact Density (High data rows)"
      >
        Compact
      </button>
      <button
        type="button"
        onClick={() => onDensityChange('standard')}
        style={{
          padding: '0.25rem 0.5rem',
          border: 'none',
          background: density === 'standard' ? 'var(--primary-light)' : 'transparent',
          color: density === 'standard' ? 'var(--primary)' : 'var(--text-muted)',
          fontSize: '0.72rem',
          fontWeight: density === 'standard' ? 700 : 500,
          cursor: 'pointer',
          borderRight: '1px solid var(--border)',
          transition: 'all 0.15s ease'
        }}
        title="Standard Density"
      >
        Standard
      </button>
      <button
        type="button"
        onClick={() => onDensityChange('comfortable')}
        style={{
          padding: '0.25rem 0.5rem',
          border: 'none',
          background: density === 'comfortable' ? 'var(--primary-light)' : 'transparent',
          color: density === 'comfortable' ? 'var(--primary)' : 'var(--text-muted)',
          fontSize: '0.72rem',
          fontWeight: density === 'comfortable' ? 700 : 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        title="Comfortable Density"
      >
        Comfortable
      </button>
    </div>
  );
}
