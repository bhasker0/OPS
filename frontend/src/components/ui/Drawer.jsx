import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const SIZE_MAP = {
  sm: '400px',
  md: '540px',
  lg: '680px',
  xl: '840px',
  full: '100vw',
};

export default function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
  direction = 'right',
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidth = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className="drawer-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        zIndex: 1300,
        display: 'flex',
        justifyContent: direction === 'left' ? 'flex-start' : 'flex-end',
        alignItems: 'stretch',
        animation: 'drawerFadeIn 0.15s ease',
      }}
    >
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          width: '100%',
          maxWidth,
          height: '100vh',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-strong)',
          display: 'flex',
          flexDirection: 'column',
          animation: direction === 'left' ? 'slideInLeft 0.2s ease' : 'slideInRight 0.2s ease',
          position: 'relative',
        }}
      >
        {/* STICKY HEADER */}
        <div
          className="drawer-header"
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            {icon && (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-canvas)',
                  color: 'var(--accent-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <h3
                style={{
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-main)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                }}
              >
                {title}
              </h3>
              {subtitle && (
                <p
                  style={{
                    fontSize: '0.72rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    margin: '0.1rem 0 0 0',
                    lineHeight: 1.3,
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="drawer-close-btn"
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              padding: '0.3rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-label="Close drawer"
          >
            <X size={15} />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div
          className="drawer-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {children}
        </div>

        {/* STICKY FOOTER */}
        {footer && (
          <div
            className="drawer-footer"
            style={{
              padding: '0.85rem 1.25rem',
              borderTop: '1px solid var(--border)',
              backgroundColor: 'var(--bg-canvas)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '0.65rem',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
