import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

function ToastItem({ toast, onRemove }) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingTimeRef = useRef(toast.duration || 4000);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={18} className="toast-icon toast-icon-success" />;
      case 'error':
        return <XCircle size={18} className="toast-icon toast-icon-error" />;
      case 'warning':
        return <AlertTriangle size={18} className="toast-icon toast-icon-warning" />;
      case 'info':
      default:
        return <Info size={18} className="toast-icon toast-icon-info" />;
    }
  };

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 250);
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

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <div
      className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
    >
      <div className="toast-content-wrapper">
        <div className="toast-icon-container">{getIcon()}</div>
        <div className="toast-text-container">
          {toast.title && <div className="toast-title">{toast.title}</div>}
          <div className="toast-message">{toast.message}</div>
        </div>
        <button className="toast-close-btn" onClick={handleDismiss} title="Dismiss notification">
          <X size={14} />
        </button>
      </div>
      <div className="toast-progress-track">
        <div
          className={`toast-progress-bar toast-progress-${toast.type}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer({ toasts = [], onRemove }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
