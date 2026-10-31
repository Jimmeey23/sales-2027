import { useCallback, useEffect, useRef, useState } from 'react';

export function useLoad<T = any>(loader: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestRef = useRef(0);
  const earlyRequest = useRef<{ id: number; promise: Promise<T> } | null>(null);
  const startedOnce = useRef(false);

  const settle = useCallback((id: number, promise: Promise<T>) => {
    setLoading(true);
    setError(null);
    return promise
      .then(
        value => {
          if (id === requestRef.current) setData(value);
          return value;
        },
        (failure: any) => {
          if (id === requestRef.current) setError(failure.message);
          throw failure;
        },
      )
      .finally(() => {
        if (id === requestRef.current) setLoading(false);
      });
  }, []);

  const reload = useCallback(() => {
    const id = ++requestRef.current;
    return settle(id, loaderRef.current());
  }, dependencies);

  // Start the request on the very first render, not in the effect below. An effect only runs
  // after the whole screen has mounted, and mounting a dense page is a few hundred milliseconds
  // the request could already be in flight for. Starting a promise is not a state update, so it
  // is safe here; the effect subscribes to it and owns every setState once React has mounted.
  if (!startedOnce.current) {
    startedOnce.current = true;
    const id = ++requestRef.current;
    const promise = loaderRef.current();
    promise.catch(() => {}); // handled for real by the effect; never an unhandled rejection
    earlyRequest.current = { id, promise };
  }

  useEffect(() => {
    const early = earlyRequest.current;
    earlyRequest.current = null;
    if (early) {
      settle(early.id, early.promise).catch(() => {});
      return;
    }
    reload().catch(() => {});
  }, [reload]);
  return { data, setData, loading, error, reload };
}

export function useDebouncedEffect(effect: () => void, dependencies: any[], delay = 300) {
  useEffect(() => {
    const timer = setTimeout(effect, delay);
    return () => clearTimeout(timer);
  }, dependencies);
}

// Runs `effect` when `value` changes after the first render; used to follow the global studio/year filters.
export function useOnChange(value: any, effect: () => void) {
  const previous = useRef(value);
  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    effect();
  }, [value]);
}
