import { useCallback, useEffect, useState, type DependencyList } from "react";
import { errorMessage } from "../api/client";

interface ApiDataState<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
}

// Loads data on mount and whenever `deps` change; ignores responses from superseded requests.
export const useApiData = <T>(load: () => Promise<T>, deps: DependencyList) => {
  const [state, setState] = useState<ApiDataState<T>>({ data: null, error: null, isLoading: true });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setState((current) => ({ ...current, error: null, isLoading: true }));

    load().then(
      (data) => {
        if (isCurrent) {
          setState({ data, error: null, isLoading: false });
        }
      },
      (error: unknown) => {
        if (isCurrent) {
          setState({ data: null, error: errorMessage(error), isLoading: false });
        }
      }
    );

    return () => {
      isCurrent = false;
    };
    // `load` is recreated every render; `deps` lists what it actually depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Applies a local change (e.g. after a successful update) without refetching.
  const updateData = useCallback((update: (current: T) => T) => {
    setState((current) => (current.data === null ? current : { ...current, data: update(current.data) }));
  }, []);

  return { ...state, reload, updateData };
};
