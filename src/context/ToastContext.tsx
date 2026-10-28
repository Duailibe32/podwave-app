import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { ToastItem, ToastType, ToastAction } from '../types/toast';

interface ToastOptions {
  message?: string;
  durationMs?: number;
  action?: ToastAction;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (type: ToastType, title: string, options?: ToastOptions) => string;
  success: (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) => string;
  error: (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) => string;
  info: (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) => string;
  warning: (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Event-based bridge so non-hook functions can also dispatch toasts safely
type ToastEventDetail = {
  type: ToastType;
  title: string;
  options?: ToastOptions;
};

const TOAST_EVENT_NAME = 'podwave_toast_dispatch';

export const dispatchGlobalToast = (type: ToastType, title: string, options?: ToastOptions) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ToastEventDetail>(TOAST_EVENT_NAME, {
        detail: { type, title, options },
      })
    );
  }
};

export const toast = {
  success: (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) =>
    dispatchGlobalToast('success', title, { ...options, message }),
  error: (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) =>
    dispatchGlobalToast('error', title, { ...options, message }),
  info: (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) =>
    dispatchGlobalToast('info', title, { ...options, message }),
  warning: (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) =>
    dispatchGlobalToast('warning', title, { ...options, message }),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    // Clear timer if exists
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, options?: ToastOptions): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const durationMs = options?.durationMs ?? 4200;

      const newToast: ToastItem = {
        id,
        type,
        title,
        message: options?.message,
        durationMs,
        action: options?.action,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // Keep maximum 4 concurrent toasts
        const next = [...prev, newToast];
        if (next.length > 4) {
          const removed = next[0];
          const timer = timersRef.current.get(removed.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.current.delete(removed.id);
          }
          return next.slice(-4);
        }
        return next;
      });

      if (durationMs > 0) {
        const timeout = setTimeout(() => {
          dismissToast(id);
        }, durationMs);
        timersRef.current.set(id, timeout);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) =>
      addToast('success', title, { ...options, message }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) =>
      addToast('error', title, { ...options, message }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) =>
      addToast('info', title, { ...options, message }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string, options?: Omit<ToastOptions, 'message'>) =>
      addToast('warning', title, { ...options, message }),
    [addToast]
  );

  // Listen to global dispatch events
  useEffect(() => {
    const handleDispatch = (e: Event) => {
      const customEvent = e as CustomEvent<ToastEventDetail>;
      if (customEvent.detail) {
        const { type, title, options } = customEvent.detail;
        addToast(type, title, options);
      }
    };

    window.addEventListener(TOAST_EVENT_NAME, handleDispatch);
    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, handleDispatch);
    };
  }, [addToast]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        success,
        error,
        info,
        warning,
        dismissToast,
        clearAllToasts,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
