import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle, X, Loader2 } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle size={24} color="#ef4444" />;
      case 'warning':
        return <AlertCircle size={24} color="#f59e0b" />;
      case 'primary':
      default:
        return <HelpCircle size={24} color="#4f46e5" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'btn-modal-danger';
      case 'warning':
        return 'btn-modal-warning';
      case 'primary':
      default:
        return 'btn-primary';
    }
  };

  return (
    <div className="modal-backdrop confirm-modal-backdrop" onClick={!loading ? onCancel : undefined}>
      <div
        className="modal-content confirm-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon-badge confirm-icon-${variant}`}>
            {getIcon()}
          </div>
          <div className="confirm-modal-heading-area">
            <h3 className="confirm-modal-title">{title}</h3>
            <p className="confirm-modal-message">{message}</p>
          </div>
          {!loading && (
            <button className="confirm-modal-close-btn" onClick={onCancel} title="Close">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${getConfirmButtonClass()}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="spin" style={{ marginRight: '0.3rem' }} />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
