import { useCallback, useEffect, useState } from 'react';
import { dsGet, dsPost } from '../api/client';

// Loads one structure's state from the backend and runs its operations.
// run() resolves to the full response, or null if the request failed.
export default function useDsState(slug) {
  const [state, setState] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dsGet(slug)
      .then((data) => {
        if (!cancelled) setState(data.state);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load data. Make sure the backend is running.');
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const run = useCallback(
    async (op, payload) => {
      setLoading(true);
      setError('');
      try {
        const data = await dsPost(slug, op, payload);
        setState(data.state);
        setResult(data.result);
        return data;
      } catch (err) {
        setError(err.message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [slug]
  );

  return { state, result, error, loading, run };
}
