import { useEffect, useRef } from "react";

/**
 * A declarative interval hook.
 *
 * @param callback The function to execute on each interval tick.
 * @param delay The interval delay in milliseconds. Pass `null` or `false` to pause.
 */
export function useInterval(
  callback: () => void,
  delay: number | null | false
) {
  const savedCallback = useRef<() => void>(callback);

  // Remember the latest callback if it changes.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    if (delay === null || delay === false) {
      return;
    }

    const id = window.setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => {
      window.clearInterval(id);
    };
  }, [delay]);
}
