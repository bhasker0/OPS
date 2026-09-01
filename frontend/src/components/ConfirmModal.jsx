import React, { useEffect } from 'react';
import { AlertCircle, HelpCircle, X, Loader2, ShieldAlert } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Operation',
  message = 'Are you sure you want to proceed with this action?',
  confirmText = 'Execute Operation',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      } else if (e.key === 'Enter' && isOpen && !loading) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel, onConfirm]);

  if (!isOpen) return null;

  const getAccentColor = () => {
    switch (variant) {
      case 'danger':
        return 'var(--accent-red)';
      case 'warning':
        return 'var(--accent-yellow)';
      case 'primary':
      default:
        return 'var(--primary)';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <ShieldAlert size={20} color="var(--accent-red)" />;
      case 'warning':
        return <AlertCircle size={20} color="var(--accent-yellow)" />;
      case 'primary':
      default:
        return <HelpCircle size={20} color="var(--primary)" />;
    }
  };

  return (
    <div className="modal-backdrop confirm-modal-backdrop" onClick={!loading ? onCancel : undefined} style={{ zIndex: 1400 }}>
      <div
        className="modal-content confirm-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-modal)',
          background: 'var(--bg-surface)',
          padding: 0,
          maxWidth: '480px',
          width: '100%',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '1.5rem 1.5rem 1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                background: variant === 'danger' ? 'var(--accent-red-bg)' : variant === 'warning' ? 'var(--accent-yellow-bg)' : 'var(--accent-blue-bg)',
                padding: '0.65rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {getIcon()}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.4rem 0', letterSpacing: '-0.02em' }}>
                {title.replace(/^\[|\]$/g, '')}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', margin: 0, lineHeight: 1.55 }}>
                {message}
              </p>
            </div>
            {!loading && (
              <button
                onClick={onCancel}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.25rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                title="Cancel (Esc)"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ACTIONS WITH KEYBOARD SHORTCUT LABELS */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1.5rem',
            background: 'var(--bg-surface-elevated)',
            borderTop: '1px solid var(--border)',
            fontSize: '0.75rem'
          }}
        >
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <kbd style={{ padding: '0.1rem 0.35rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '0.7rem' }}>Esc</kbd>
            <span>Cancel</span>
            <span style={{ margin: '0 0.2rem' }}>&bull;</span>
            <kbd style={{ padding: '0.1rem 0.35rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '3px', fontSize: '0.7rem' }}>↵ Enter</kbd>
            <span>Confirm</span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
              style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
            >
              {cancelText.replace(/^\[|\]$/g, '')}
            </button>
            <button
              type="button"
              className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
              disabled={loading}
              style={{
                fontSize: '0.78rem',
                padding: '0.4rem 0.9rem',
                fontWeight: 600
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="spin" style={{ marginRight: '0.35rem' }} />
                  Processing...
                </>
              ) : (
                confirmText.replace(/^\[|\]$/g, '')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

