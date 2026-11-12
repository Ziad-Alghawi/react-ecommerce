import { AlertIcon, CheckIcon, CloseIcon } from './Icons';
import type { Toast } from '../hooks/useToast';
import './Toasts.css';

interface ToastsProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

// Both live regions are always on the page, so screen readers announce what's added to them.
// Confirmations wait their turn, errors are read out straight away
export function Toasts({ toasts, onDismiss }: ToastsProps) {
  const renderToast = ({ id, message, isError, action }: Toast) => (
    <div key={id} className={`toast${isError ? ' toast-error' : ''}`} data-testid="toast">
      {isError ? <AlertIcon className="toast-icon" /> : <CheckIcon className="toast-icon" />}
      <div className="toast-message">{message}</div>
      {action && (
        <button className="toast-action" type="button" data-testid="toast-action"
          onClick={() => {
            onDismiss(id);
            action.onClick();
          }}>
          {action.label}
        </button>
      )}
      <button className="toast-close" type="button" aria-label="Close" onClick={() => onDismiss(id)}>
        <CloseIcon />
      </button>
    </div>
  );

  return (
    <div className="toasts">
      <div className="toast-region" role="status" aria-label="Notifications">
        {toasts.filter((toast) => !toast.isError).map(renderToast)}
      </div>
      <div className="toast-region" role="alert" aria-label="Errors">
        {toasts.filter((toast) => toast.isError).map(renderToast)}
      </div>
    </div>
  );
}
