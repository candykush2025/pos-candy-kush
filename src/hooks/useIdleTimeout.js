import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Hook to detect user inactivity
 * @param {Function} onIdle - Callback when user becomes idle
 * @param {number} timeout - Timeout in milliseconds (0 = disabled)
 * @returns {number} remainingTime - Remaining time in seconds
 */
export function useIdleTimeout(onIdle, timeout = 0) {
  const timeoutIdRef = useRef(null);
  const isIdleRef = useRef(false);
  const startTimeRef = useRef(null);
  const lastResetTimeRef = useRef(0);
  const timeoutRef = useRef(timeout);
  const onIdleRef = useRef(onIdle);
  const [remainingTime, setRemainingTime] = useState(0);

  // Keep refs updated
  useEffect(() => {
    timeoutRef.current = timeout;
    onIdleRef.current = onIdle;
  }, [timeout, onIdle]);

  const resetTimer = useCallback(() => {
    // Debounce: Only reset if at least 500ms has passed since last reset
    const now = Date.now();
    if (now - lastResetTimeRef.current < 500) {
      return;
    }
    lastResetTimeRef.current = now;

    // Clear existing timeout
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // Don't set timer if timeout is 0 (disabled)
    if (timeoutRef.current === 0) {
      setRemainingTime(0);
      return;
    }

    isIdleRef.current = false;
    startTimeRef.current = now;

    // Set new timeout
    timeoutIdRef.current = setTimeout(() => {
      if (!isIdleRef.current) {
        isIdleRef.current = true;
        setRemainingTime(0);
        onIdleRef.current();
      }
    }, timeoutRef.current);
  }, []); // No dependencies - stable function

  useEffect(() => {
    // Events to track user activity (removed mousemove to reduce noise)
    const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, true);
    });

    // Start the timer
    resetTimer();

    // Cleanup
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer, true);
      });
    };
  }, [resetTimer]);

  // Separate effect for countdown display
  useEffect(() => {
    if (timeout === 0) {
      setRemainingTime(0);
      return;
    }

    // Initial reset when timeout changes
    resetTimer();

    const countdownInterval = setInterval(() => {
      if (startTimeRef.current && timeoutRef.current > 0) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(
          0,
          Math.ceil((timeoutRef.current - elapsed) / 1000)
        );
        setRemainingTime(remaining);
      }
    }, 1000);

    return () => {
      clearInterval(countdownInterval);
    };
  }, [timeout, resetTimer]);

  return remainingTime;
}
