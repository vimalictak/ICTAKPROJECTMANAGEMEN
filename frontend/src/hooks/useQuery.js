import { useState, useEffect, useCallback, useRef } from 'react';
import { getErrorMessage } from '../api/client';

/**
 * Generic data fetching hook with loading, error, and refetch support.
 */
export const useQuery = (fetchFn, deps = [], options = {}) => {
  const { enabled = true, onSuccess, onError } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFn();
      if (mounted.current) {
        setData(res.data);
        onSuccess?.(res.data);
      }
    } catch (err) {
      if (mounted.current) {
        const msg = getErrorMessage(err);
        setError(msg);
        onError?.(msg);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [...deps, enabled]);

  useEffect(() => {
    mounted.current = true;
    fetch();
    return () => { mounted.current = false; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
};

/**
 * Mutation hook for create/update/delete operations.
 */
export const useMutation = (mutateFn, options = {}) => {
  const { onSuccess, onError } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (variables) => {
    setLoading(true);
    setError(null);
    try {
      const res = await mutateFn(variables);
      onSuccess?.(res.data);
      return res.data;
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      onError?.(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutateFn]);

  return { mutate, loading, error };
};

/**
 * Paginated query hook.
 */
export const usePaginatedQuery = (fetchFn, params = {}, deps = []) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});

  const { data, loading, error, refetch } = useQuery(
    () => fetchFn({ page, limit: 20, search, ...filters, ...params }),
    [page, search, JSON.stringify(filters), ...deps]
  );

  return {
    data: data?.data || data?.tasks || data?.projects || data?.users || [],
    pagination: data?.pagination || {},
    total: data?.total || 0,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilters,
    refetch,
  };
};
