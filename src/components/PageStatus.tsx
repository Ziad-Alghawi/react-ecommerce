import { useEffect, useState } from 'react';
import './PageStatus.css';

// How long to wait before explaining why loading is taking a while
const SLOW_LOADING_MS = 4000;

export function LoadingMessage() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="page-status" role="status" data-testid="loading-message">
      <div className="page-status-spinner"></div>
      <div>Loading...</div>
      {isSlow && (
        <div className="page-status-detail" data-testid="slow-loading-message">
          The demo server is waking up. This can take up to a minute.
        </div>
      )}
    </div>
  );
}

// Shown inside a button while its request runs
export function ButtonSpinner() {
  return <span className="button-spinner" aria-hidden="true" data-testid="button-spinner"></span>;
}

interface ErrorMessageProps {
  title?: string;
  detail?: string;
  buttonText?: string;
  onButtonClick: () => void;
}

export function ErrorMessage({
  title = "We couldn't load this page",
  detail = 'The demo server may be waking up. Please try again in a moment.',
  buttonText = 'Try again',
  onButtonClick
}: ErrorMessageProps) {
  return (
    <div className="page-status" role="alert" data-testid="error-message">
      <div>{title}</div>
      <div className="page-status-detail">{detail}</div>
      <button className="page-status-button button-primary" onClick={onButtonClick}
        data-testid="error-message-button">
        {buttonText}
      </button>
    </div>
  );
}
