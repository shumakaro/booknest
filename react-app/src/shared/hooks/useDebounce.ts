import { useEffect } from "react";

export function useDebounce<T>(
  value: T,
  callback: (value: T) => void,
  delay = 350,
): void {
  useEffect(() => {
    const timerId = globalThis.setTimeout(() => {
      callback(value);
    }, delay);

    return () => {
      globalThis.clearTimeout(timerId);
    };
  }, [value, callback, delay]);
}