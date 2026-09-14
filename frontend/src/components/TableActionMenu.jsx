import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export default function TableActionMenu({ actions = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0, left: 0, openUpward: false });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const calculatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 205;
    const estimatedHeight = Math.min(actions.length * 38 + 12, 260);

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight && rect.top > estimatedHeight;

    let top = openUpward ? rect.top - estimatedHeight - 4 : rect.bottom + 4;
    let right = window.innerWidth - rect.right;

    // Safety checks against screen boundaries
    if (right < 8) right = 8;
    if (right + menuWidth > window.innerWidth) {
      right = Math.max(8, window.innerWidth - rect.left - menuWidth);
    }

    setMenuPosition({
      top: Math.max(8, top),
      right: Math.max(8, right),
      openUpward
    });
  };

  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const visibleActions = actions.filter((a) => !a.hidden);
  if (visibleActions.length === 0) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="kebab-btn"
        onClick={handleToggle}
        title="More Actions"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: 'var(--radius-sm)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border)',
          background: isOpen ? 'var(--bg-surface-elevated)' : 'transparent',
          color: isOpen ? 'var(--text-main)' : 'var(--text-muted)',
          cursor: 'pointer'
        }}
      >
        <MoreVertical size={15} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="kebab-popover shadow-lg animate-fade-in"
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
              zIndex: 99999,
              minWidth: '205px',
              maxWidth: '280px',
              background: 'var(--bg-surface, #ffffff)',
              border: '1px solid var(--border-strong, #d1d5db)',
              borderRadius: 'var(--radius-md, 6px)',
              boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.2), 0 6px 12px -3px rgba(0, 0, 0, 0.1)',
              padding: '0.35rem 0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {visibleActions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                className={`kebab-popover-item ${action.danger ? 'danger' : ''}`}
                disabled={action.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  if (action.onClick) action.onClick();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-sans)',
                  color: action.danger ? 'var(--accent-red, #dc2626)' : 'var(--text-main, #111827)',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  opacity: action.disabled ? 0.5 : 1,
                  width: '100%',
                  transition: 'background 0.12s ease'
                }}
                onMouseEnter={(e) => {
                  if (!action.disabled) {
                    e.currentTarget.style.background = action.danger
                      ? 'var(--accent-red-bg, rgba(239, 68, 68, 0.08))'
                      : 'var(--bg-surface-elevated, #f3f4f6)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {action.icon && <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>{action.icon}</span>}
                <span style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{action.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

