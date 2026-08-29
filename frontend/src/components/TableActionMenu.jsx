import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export default function TableActionMenu({ actions = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const visibleActions = actions.filter((a) => !a.hidden);
  if (visibleActions.length === 0) return null;

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="kebab-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        title="Actions"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="kebab-popover">
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
            >
              {action.icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
