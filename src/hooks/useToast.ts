import { createContext, useCallback, useContext, useState } from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  message: string;
  isError: boolean;
  action?: ToastAction;
}

interface ToastOptions {
  isError?: boolean;
  action?: ToastAction;
}

export type ShowToast = (message: string, options?: ToastOptions) => void;

// Long enough to read a short message. Errors stay until closed, as they can offer to try again
const TOAST_MS = 5000;
const MAX_TOASTS = 3;

// App fills this in, so any page can confirm an action or report a failure
export const ToastContext = createContext<ShowToast>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

let nextToastId = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ShowToast>((message, { isError = false, action } = {}) => {
    const id = nextToastId++;
    // Only the latest error is shown, so "Try again" always repeats the action that just failed
    setToasts((current) => [
      ...current.filter((toast) => !(isError && toast.isError)),
      { id, message, isError, action }
    ].slice(-MAX_TOASTS));
    if (!isError) {
      setTimeout(() => dismissToast(id), TOAST_MS);
    }
  }, [dismissToast]);

  return { toasts, showToast, dismissToast };
}
