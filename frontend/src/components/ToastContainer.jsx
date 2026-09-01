import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

function ToastItem({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef(Date.now());

  const getStatusBadge = () => {
    switch (toast.type) {
      case 'success':
        return <span className="badge badge-pastel-green" style={{ fontSize: '0.65rem' }}>Success</span>;
      case 'error':
        return <span className="badge badge-pastel-red" style={{ fontSize: '0.65rem' }}>Error</span>;
      case 'warning':
        return <span className="badge badge-pastel-yellow" style={{ fontSize: '0.65rem' }}>Warning</span>;
      case 'info':
      default:
        return <span className="badge badge-pastel-blue" style={{ fontSize: '0.65rem' }}>Info</span>;
    }
  };

  const getAccentColor = () => {
    switch (toast.type) {
      case 'success':
        return 'var(--accent-green)';
      case 'error':
        return 'var(--accent-red)';
      case 'warning':
        return 'var(--accent-yellow)';
      case 'info':
      default:
        return 'var(--primary)';
    }
  };

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 200);
  };

  useEffect(() => {
    const totalDuration = toast.duration || 4000;
    const interval = 25;

    const progressTimer = setInterval(() => {
      if (!isPaused) {
        const elapsed = Date.now() - startTimeRef.current;
        const currentProgress = Math.max(0, 100 - (elapsed / totalDuration) * 100);
        setProgress(currentProgress);

        if (elapsed >= totalDuration) {
          clearInterval(progressTimer);
          handleDismiss();
        }
      }
    }, interval);

    return () => clearInterval(progressTimer);
  }, [isPaused, toast.duration]);

  return (
    <div
      className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        boxShadow: 'var(--shadow-modal)',
        padding: 0,
        overflow: 'hidden',
        minWidth: '320px',
        maxWidth: '400px'
      }}
    >
      <div style={{ padding: '0.85rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
          {getStatusBadge()}
          <button
            onClick={handleDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 0.15rem' }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        {toast.title && (
          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
            {toast.title}
          </div>
        )}
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {toast.message}
        </div>
      </div>

      <div style={{ height: '2px', background: 'var(--bg-surface-elevated)', width: '100%' }}>
        <div
          style={{
            height: '100%',
            background: getAccentColor(),
            width: `${progress}%`,
            transition: 'width 25ms linear'
          }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container" aria-live="polite" style={{ zIndex: 9999, right: '1.5rem', bottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

