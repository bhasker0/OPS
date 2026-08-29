import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastContainer from '../components/ToastContainer';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({ type = 'info', title = '', message = '', duration = 4000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast = {
      id,
      type, // 'success' | 'error' | 'warning' | 'info'
      title,
      message,
      duration,
      createdAt: Date.now(),
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const toast = {
    success: (message, title = 'Success') => showToast({ type: 'success', title, message }),
    error: (message, title = 'Error') => showToast({ type: 'error', title, message, duration: 6000 }),
    warning: (message, title = 'Warning') => showToast({ type: 'warning', title, message }),
    info: (message, title = 'Information') => showToast({ type: 'info', title, message }),
    remove: removeToast,
  };

  return (
    <ToastContext.Provider value={{ toast, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}

export default ToastContext;
