import * as Crypto from 'expo-crypto';
import { getLocales } from 'expo-localization';
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { openAppDatabase } from '@/data/db/openDatabase';
import { Repositories, createRepositories } from '@/data/repositories';
import { UnitPreferences } from '@/data/repositories/profileRepository';
import { deviceTimeZone, localDateString } from '@/domain/dates';

export interface AppServices {
  repos: Repositories;
  ownerId: string;
  persistent: boolean;
  storageLabel: string;
  /** Bumps after every write so screens can re-query. */
  version: number;
  invalidate: () => void;
  todayLocal: () => string;
  localeUnitDefaults: Omit<UnitPreferences, 'confirmed'>;
}

const Ctx = createContext<AppServices | null>(null);

/** Unit defaults from the phone's measurement system; always shown to the golfer and editable. */
export function localeUnitDefaults(): Omit<UnitPreferences, 'confirmed'> {
  const system = getLocales()[0]?.measurementSystem ?? null;
  if (system === 'us') return { distanceUnit: 'yards', clubLengthUnit: 'in', heightUnit: 'ft_in' };
  if (system === 'uk') return { distanceUnit: 'yards', clubLengthUnit: 'in', heightUnit: 'ft_in' };
  return { distanceUnit: 'metres', clubLengthUnit: 'cm', heightUnit: 'cm' };
}

type State =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; repos: Repositories; ownerId: string; persistent: boolean; storageLabel: string }
  | { phase: 'conflict'; message: string };

export function AppServicesProvider({
  children,
  renderLoading,
  renderError,
  renderConflict,
}: {
  children: ReactNode;
  renderLoading: () => ReactNode;
  renderError: (message: string, retry: () => void) => ReactNode;
  /** Shown when the stored data was changed elsewhere (browser preview, another tab). */
  renderConflict: (message: string) => ReactNode;
}) {
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [version, setVersion] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opened = await openAppDatabase();
        // A refused save means another tab/window changed the data: stop and ask for a reload
        // rather than continuing with an out-of-date copy.
        opened.onStorageConflict?.((message) => !cancelled && setState({ phase: 'conflict', message }));
        const timeZone = deviceTimeZone();
        const repos = createRepositories({ db: opened.driver, newId: () => Crypto.randomUUID(), now: () => new Date(), timeZone });
        const ownerId = await repos.initialise();
        if (!cancelled) setState({ phase: 'ready', repos, ownerId, persistent: opened.persistent, storageLabel: opened.storageLabel });
      } catch (e) {
        if (!cancelled) setState({ phase: 'error', message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);
  const defaults = useMemo(() => localeUnitDefaults(), []);

  const value = useMemo<AppServices | null>(() => {
    if (state.phase !== 'ready') return null;
    return {
      repos: state.repos,
      ownerId: state.ownerId,
      persistent: state.persistent,
      storageLabel: state.storageLabel,
      version,
      invalidate,
      todayLocal: () => localDateString(new Date(), deviceTimeZone()),
      localeUnitDefaults: defaults,
    };
  }, [state, version, invalidate, defaults]);

  if (state.phase === 'loading') return <>{renderLoading()}</>;
  if (state.phase === 'conflict') return <>{renderConflict(state.message)}</>;
  if (state.phase === 'error') return <>{renderError(state.message, () => { setState({ phase: 'loading' }); setAttempt((a) => a + 1); })}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useServices(): AppServices {
  const v = useContext(Ctx);
  if (!v) throw new Error('useServices must be used inside AppServicesProvider');
  return v;
}

/**
 * Runs an async query and re-runs it whenever data changes (invalidate) or
 * deps change. Keeps the previous data while reloading to avoid flicker.
 */
export function useQuery<T>(fn: (s: AppServices) => Promise<T>, deps: unknown[] = []): { data: T | undefined; error: string | null; loading: boolean } {
  const services = useServices();
  const [state, setState] = useState<{ data: T | undefined; error: string | null; key: unknown[] | null }>({ data: undefined, error: null, key: null });
  const fnRef = useRef(fn);
  const key = [services.version, ...deps];

  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let cancelled = false;
    const loadedKey = [services.version, ...deps];
    fnRef
      .current(services)
      .then((d) => {
        if (!cancelled) setState({ data: d, error: null, key: loadedKey });
      })
      .catch((e) => {
        if (!cancelled) setState((prev) => ({ data: prev.data, error: e instanceof Error ? e.message : String(e), key: loadedKey }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.version, ...deps]);

  const loading = state.key === null || state.key.length !== key.length || state.key.some((k, i) => k !== key[i]);
  return { data: state.data, error: state.error, loading };
}

export function useUnits(): UnitPreferences | undefined {
  return useQuery((s) => s.repos.preferences.getUnits(s.ownerId, s.localeUnitDefaults)).data;
}
