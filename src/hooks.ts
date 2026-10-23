import { useCallback, useEffect, useRef, useState } from 'react';

export function useLoad<T = any>(loader: () => Promise<T>, dependencies: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader); loaderRef.current = loader;
  const requestRef = useRef(0);
  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true); setError(null);
    try { const value = await loaderRef.current(); if (requestId === requestRef.current) setData(value); return value; }
    catch (error: any) { if (requestId === requestRef.current) setError(error.message); throw error; }
    finally { if (requestId === requestRef.current) setLoading(false); }
  }, dependencies);
  useEffect(() => { reload().catch(() => {}); }, [reload]);
  return { data, setData, loading, error, reload };
}

export function useDebouncedEffect(effect: () => void, dependencies: any[], delay = 300) {
  useEffect(() => { const timer = setTimeout(effect, delay); return () => clearTimeout(timer); }, dependencies);
}
