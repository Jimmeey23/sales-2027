import { useCallback, useEffect, useRef, useState } from 'react';

export function useLoad<T = any>(loader: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const requestRef = useRef(0);
  // Start the request on the first render rather than in an effect. An effect only runs after
  // the whole screen has mounted and painted, which on a dense page is ~300 ms of layout the
  // request could already have been in flight for. The effect below stays responsible for
  // reloads after that (a dependency change, an explicit reload()).
  const primed = useRef(false),
    skipEffect = useRef(false);
  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const value = await loaderRef.current();
      if (requestId === requestRef.current) setData(value);
      return value;
    } catch (error: any) {
      if (requestId === requestRef.current) setError(error.message);
      throw error;
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, dependencies);
  if (!primed.current) {
    primed.current = true;
    skipEffect.current = true;
    reload().catch(() => {});
  }
  useEffect(() => {
    if (skipEffect.current) {
      skipEffect.current = false;
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
