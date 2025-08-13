import { useEffect, useRef } from 'react';

interface UseTabFocusProps {
  onFocus?: () => void;
  onBlur?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
  enabled?: boolean;
}

export function useTabFocus({ 
  onFocus, 
  onBlur, 
  onVisibilityChange, 
  enabled = true 
}: UseTabFocusProps = {}) {
  const lastVisibilityState = useRef<boolean>(true);
  const lastFocusState = useRef<boolean>(true);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      if (lastVisibilityState.current !== isVisible) {
        lastVisibilityState.current = isVisible;
        onVisibilityChange?.(isVisible);
        
        if (isVisible) {
          // Tab became visible
          setTimeout(() => {
            if (!document.hidden) {
              onFocus?.();
            }
          }, 100);
        } else {
          // Tab became hidden
          onBlur?.();
        }
      }
    };

    const handleWindowFocus = () => {
      if (!lastFocusState.current) {
        lastFocusState.current = true;
        onFocus?.();
      }
    };

    const handleWindowBlur = () => {
      if (lastFocusState.current) {
        lastFocusState.current = false;
        onBlur?.();
      }
    };

    // Set initial states
    lastVisibilityState.current = !document.hidden;
    lastFocusState.current = document.hasFocus();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onFocus, onBlur, onVisibilityChange, enabled]);

  return {
    isVisible: !document.hidden,
    isFocused: typeof window !== 'undefined' ? document.hasFocus() : true
  };
}
