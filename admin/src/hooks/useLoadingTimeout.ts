import { useEffect, useState } from 'react';

interface UseLoadingTimeoutProps {
  loading: boolean;
  timeout?: number;
  onTimeout?: () => void;
}

export function useLoadingTimeout({ 
  loading, 
  timeout = 10000, 
  onTimeout 
}: UseLoadingTimeoutProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setHasTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      if (loading) {
        setHasTimedOut(true);
        onTimeout?.();
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [loading, timeout, onTimeout]);

  return { hasTimedOut };
}
