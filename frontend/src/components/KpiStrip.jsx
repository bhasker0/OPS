import React from 'react';

export default function KpiStrip({ items = [], activeFilter = null, onFilterSelect }) {
  return (
    <div className="kpi-strip">
      {items.map((item, idx) => {
        const isActive = activeFilter && item.filterKey === activeFilter;
        return (
          <div
            key={idx}
            className={`kpi-card-compact ${isActive ? 'active-filter' : ''}`}
            onClick={() => onFilterSelect && onFilterSelect(item.filterKey)}
            title={item.tooltip || `Click to filter by ${item.label}`}
          >
            <div>
              <div className="kpi-metric-label" style={{ color: item.accentColor || 'var(--text-muted)' }}>
                {item.label}
              </div>
              <div className="kpi-metric-value" style={{ color: item.accentColor || 'var(--text-main)' }}>
                {item.value}
              </div>
              {item.subtext && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '0.1rem' }}>
                  {item.subtext}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
              {item.icon && (
                <div style={{ color: item.accentColor || 'var(--primary)', opacity: 0.85 }}>
                  {item.icon}
                </div>
              )}
              {/* Micro SVG Sparkline (7-day trend simulator) */}
              <svg width="48" height="20" viewBox="0 0 48 20" style={{ overflow: 'visible' }}>
                <path
                  d={item.sparklinePath || "M0 16 Q 12 6, 24 12 T 48 4"}
                  fill="none"
                  stroke={item.accentColor || "var(--primary)"}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}
