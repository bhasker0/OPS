import React from 'react';

export default function KpiStrip({ items = [], activeFilter = null, onFilterSelect }) {
  return (
    <div className="bento-grid">
      {items.map((item, idx) => {
        const isActive = activeFilter && item.filterKey === activeFilter;
        return (
          <div
            key={idx}
            className={`bento-card bento-span-3 ${isActive ? 'active-filter' : ''}`}
            onClick={() => onFilterSelect && onFilterSelect(item.filterKey)}
            title={item.tooltip || `Click to filter by ${item.label}`}
            style={{
              cursor: onFilterSelect ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
              animation: 'fadeIn 0.3s ease-out both',
              animationDelay: `${idx * 60}ms`,
              borderColor: isActive ? 'var(--primary)' : 'var(--border)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {item.label}
              </div>
              {item.icon && (
                <div style={{ color: item.accentColor || 'var(--text-muted)', opacity: 0.85 }}>
                  {item.icon}
                </div>
              )}
            </div>

            <div>
              <div className="font-mono-tabular" style={{ fontSize: '1.45rem', fontWeight: 700, color: item.accentColor || 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {item.value}
              </div>
              {item.subtext && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  {item.subtext}
                </div>
              )}
            </div>

            {/* SMOOTH CURVED SVG SPARKLINES */}
            <div style={{ marginTop: '0.25rem' }}>
              <svg width="100%" height="22" viewBox="0 0 120 22" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id={`sparkline-grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={item.accentColor || "var(--primary)"} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={item.accentColor || "var(--primary)"} stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d={item.sparklineArea || "M 0 18 Q 30 14, 60 10 T 120 4 L 120 22 L 0 22 Z"}
                  fill={`url(#sparkline-grad-${idx})`}
                />
                <path
                  d={item.sparklineCurve || "M 0 18 Q 30 14, 60 10 T 120 4"}
                  fill="none"
                  stroke={item.accentColor || "var(--text-main)"}
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

