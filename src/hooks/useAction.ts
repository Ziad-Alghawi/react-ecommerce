import { createContext, useContext, useRef, useState } from 'react';

type ReportActionFailure = (error: unknown, retry: () => Promise<void>) => void;

// App fills this in, so its "Try again" button can repeat the action that failed
export const ActionFailureContext = createContext<ReportActionFailure>(() => {});

// Runs the request behind a button and tracks whether it is still running,
// so the button can be disabled and show a spinner meanwhile
export function useAction(action: () => Promise<void>) {
  const [isPending, setIsPending] = useState(false);
  const isRunning = useRef(false);
  const reportFailure = useContext(ActionFailureContext);

  const run = async () => {
    // A double click or a second Enter press shouldn't send the request twice
    if (isRunning.current) {
      return;
    }
    isRunning.current = true;
    setIsPending(true);
    try {
      await action();
    } catch (error) {
      reportFailure(error, run);
    } finally {
      isRunning.current = false;
      setIsPending(false);
    }
  };

  return [run, isPending] as const;
}
