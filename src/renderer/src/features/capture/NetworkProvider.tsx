import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { type NetworkEntry, type NetworkState, NO_NETWORK } from '../../../../shared/network';

/** A user edit, tied to the kept text it started from; a newer merged body makes it stale. */
interface NetworkEdit {
  base: string;
  text: string;
}

interface NetworkContextValue {
  /** False outside Electron, where there is no browser to record. */
  available: boolean;
  network: NetworkState;
  /** The text the user sees and exports for an entry: their edit, or the kept text. */
  textOf: (entry: NetworkEntry) => string;
  /** Starts recording; resolves to an error message, or null when recording started. */
  start: () => Promise<string | null>;
  stop: () => void;
  clear: () => void;
  remove: (id: string) => void;
  edit: (id: string, base: string, text: string) => void;
  restore: (id: string) => void;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

/** Mirrors the network capture state that main pushes, plus the user's edits to kept text. */
export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<NetworkState>(NO_NETWORK);
  const [edits, setEdits] = useState<Readonly<Record<string, NetworkEdit>>>({});
  const available = window.bridge !== undefined;

  useEffect(() => {
    const api = window.bridge;
    if (!api) return;
    let active = true;
    void api.networkGetState().then((initial) => {
      if (active) setNetwork(initial);
    });
    const unsubscribe = api.onNetworkState(setNetwork);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const textOf = useCallback(
    (entry: NetworkEntry) => {
      const edit = edits[entry.id];
      return edit && edit.base === entry.text ? edit.text : entry.text;
    },
    [edits],
  );

  const start = useCallback(async () => {
    const api = window.bridge;
    if (!api) return 'Recording needs the desktop app.';
    const response = await api
      .networkStart()
      .catch(() => ({ ok: false as const, error: 'Recording could not start.' }));
    return response.ok ? null : response.error;
  }, []);

  const stop = useCallback(() => {
    void window.bridge?.networkStop();
  }, []);

  const clear = useCallback(() => {
    setEdits({});
    void window.bridge?.networkClear();
  }, []);

  const remove = useCallback((id: string) => {
    setEdits(({ [id]: _removed, ...rest }) => rest);
    void window.bridge?.networkRemove(id);
  }, []);

  const edit = useCallback((id: string, base: string, text: string) => {
    setEdits((current) => ({ ...current, [id]: { base, text } }));
  }, []);

  const restore = useCallback((id: string) => {
    setEdits(({ [id]: _removed, ...rest }) => rest);
  }, []);

  const value = useMemo(
    () => ({ available, network, textOf, start, stop, clear, remove, edit, restore }),
    [available, network, textOf, start, stop, clear, remove, edit, restore],
  );
  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  const value = useContext(NetworkContext);
  if (!value) throw new Error('useNetwork must be used inside NetworkProvider');
  return value;
}
