import { useCallback, useEffect, useRef, useState } from "react";

export type UsePollingOptions = {
  /** Whether polling is actively enabled. Defaults to true. */
  enabled?: boolean;
  /** Whether to trigger the callback immediately on mount or when enabled. Defaults to true. */
  runImmediately?: boolean;
  /** Optional error handler callback. */
  onError?: (error: unknown) => void;
};

export type UsePollingReturn = {
  /** Whether polling is actively enabled. */
  isPolling: boolean;
  /** Whether a polling execution is currently in-flight. */
  isLoading: boolean;
  /** The last error encountered during polling, if any. */
  error: unknown | null;
  /** Timestamp of the last successful polling execution. */
  lastPolledAt: Date | null;
  /** Manually trigger an immediate poll execution. */
  trigger: () => Promise<void>;
};

/**
 * Robust async polling hook that handles component unmounts,
 * prevents overlapping executions, and supports dynamic enable/pause toggles.
 *
 * @param callback The async function to execute periodically.
 * @param intervalMs The polling interval in milliseconds (e.g. 5000 for 5s).
 * @param options Configuration options.
 */
export function usePolling(
  callback: () => Promise<void> | void,
  intervalMs: number,
  options: UsePollingOptions = {}
): UsePollingReturn {
  const { enabled = true, runImmediately = true, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);
  const [lastPolledAt, setLastPolledAt] = useState<Date | null>(null);

  const mountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const callbackRef = useRef(callback);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async () => {
    if (inFlightRef.current || !mountedRef.current) {
      return;
    }

    inFlightRef.current = true;
    if (mountedRef.current) {
      setIsLoading(true);
    }

    try {
      await callbackRef.current();
      if (mountedRef.current) {
        setError(null);
        setLastPolledAt(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err);
      }
      if (onErrorRef.current) {
        onErrorRef.current(err);
      }
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (runImmediately && (typeof document === "undefined" || !document.hidden)) {
      void execute();
    }

    const intervalId = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      void execute();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void execute();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      window.clearInterval(intervalId);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [enabled, intervalMs, runImmediately, execute]);

  return {
    isPolling: enabled,
    isLoading,
    error,
    lastPolledAt,
    trigger: execute,
  };
}
