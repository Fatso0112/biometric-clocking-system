import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { refreshAuthentication } from '../services/authApi';
import { registerAccessTokenRefresher } from '../services/authSessionBridge';
import type { StorageKind } from '../services/persistentStore';
import {
  clearAllSessionStorage,
  EMPTY_SESSION,
  hydrateSession,
  persistSession,
  type SessionData,
} from '../services/sessionPersistence';
import type {
  AuthenticatedIdentity,
  UserRole,
} from '../types/session';

export interface SessionState extends SessionData {
  /** Compatibility alias used by attendance screens. */
  staffNumber: string | null;
}

export type SessionContextValue = SessionState & {
  clockOutGuardMessage: string | null;
  requiresReauthentication: boolean;

  startSession: (
    identity: AuthenticatedIdentity,
    rememberMe: boolean,
  ) => void;

  setActiveRole: (role: UserRole) => void;
  recordClockIn: (clockInTime: Date) => void;
  recordClockOut: () => void;
  showClockOutGuardMessage: () => void;
  clearClockOutGuardMessage: () => void;
  clearSession: () => void;
  acknowledgeReauthentication: () => void;
};

const CLOCK_OUT_GUARD_MESSAGE =
  'You need to clock in before you can clock out.';

const REFRESH_EARLY_BY_MS = 60_000;

const SessionContext =
  createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({
  children,
}: SessionProviderProps) {
  const [hydratedSession] = useState(hydrateSession);

  const [session, setSession] =
    useState<SessionData>(hydratedSession.session);

  const sessionRef =
    useRef<SessionData>(hydratedSession.session);

  const storageKindRef =
    useRef<StorageKind | null>(
      hydratedSession.storageKind,
    );

  const refreshPromiseRef =
    useRef<Promise<string | null> | null>(null);

  const sessionEpochRef = useRef(0);

  const [requiresReauthentication, setRequiresReauthentication] =
    useState(
      hydratedSession.requiresReauthentication,
    );

  const [clockOutGuardMessage, setClockOutGuardMessage] =
    useState<string | null>(null);

  const commitSession = useCallback(
    (
      nextSession: SessionData,
      storageKind = storageKindRef.current,
    ) => {
      sessionRef.current = nextSession;
      storageKindRef.current = storageKind;

      if (storageKind) {
        persistSession(nextSession, storageKind);
      }

      setSession(nextSession);
    },
    [],
  );

  const invalidateSession = useCallback(() => {
    sessionEpochRef.current += 1;
    clearAllSessionStorage();
    sessionRef.current = EMPTY_SESSION;
    storageKindRef.current = null;
    setSession(EMPTY_SESSION);
    setRequiresReauthentication(true);
    setClockOutGuardMessage(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const currentSession = sessionRef.current;
    const refreshToken = currentSession.refreshToken;
    const refreshTokenExpiresAtUtc =
      currentSession.refreshTokenExpiresAtUtc;

    if (
      !refreshToken ||
      !refreshTokenExpiresAtUtc ||
      new Date(refreshTokenExpiresAtUtc).getTime() <= Date.now()
    ) {
      invalidateSession();
      return null;
    }

    const refreshEpoch = sessionEpochRef.current;

    const refreshPromise = (async () => {
      const response = await refreshAuthentication(
        refreshToken,
        currentSession.activeRole,
      );

      if (
        response.status !== 'authenticated' ||
        refreshEpoch !== sessionEpochRef.current
      ) {
        if (refreshEpoch === sessionEpochRef.current) {
          invalidateSession();
        }

        return null;
      }

      const nextSession: SessionData = {
        ...response.identity,
        clockInTime: currentSession.clockInTime,
      };

      commitSession(nextSession);
      setRequiresReauthentication(false);

      return response.identity.accessToken;
    })()
      .catch(() => {
        if (refreshEpoch === sessionEpochRef.current) {
          invalidateSession();
        }

        return null;
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });

    refreshPromiseRef.current = refreshPromise;
    return refreshPromise;
  }, [commitSession, invalidateSession]);

  useEffect(
    () => registerAccessTokenRefresher(refreshSession),
    [refreshSession],
  );

  useEffect(() => {
    if (
      !session.accessTokenExpiresAtUtc ||
      !session.refreshToken
    ) {
      return undefined;
    }

    const expiresAt = new Date(
      session.accessTokenExpiresAtUtc,
    ).getTime();

    if (Number.isNaN(expiresAt)) {
      invalidateSession();
      return undefined;
    }

    const delay = Math.max(
      0,
      expiresAt - Date.now() - REFRESH_EARLY_BY_MS,
    );

    const timer = window.setTimeout(() => {
      void refreshSession();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    invalidateSession,
    refreshSession,
    session.accessTokenExpiresAtUtc,
    session.refreshToken,
  ]);

  const startSession = useCallback(
    (
      identity: AuthenticatedIdentity,
      rememberMe: boolean,
    ) => {
      sessionEpochRef.current += 1;

      const storageKind: StorageKind =
        rememberMe ? 'local' : 'session';

      commitSession(
        {
          ...identity,
          clockInTime: null,
        },
        storageKind,
      );

      setRequiresReauthentication(false);
      setClockOutGuardMessage(null);
    },
    [commitSession],
  );

  const setActiveRole = useCallback(
    (role: UserRole) => {
      const currentSession = sessionRef.current;

      if (!currentSession.authorizedRoles.includes(role)) {
        return;
      }

      commitSession({
        ...currentSession,
        activeRole: role,
      });
    },
    [commitSession],
  );

  const recordClockIn = useCallback(
    (clockInTime: Date) => {
      const currentSession = sessionRef.current;

      commitSession({
        ...currentSession,
        clockInTime,
      });

      setClockOutGuardMessage(null);
    },
    [commitSession],
  );

  const recordClockOut = useCallback(() => {
    const currentSession = sessionRef.current;

    commitSession({
      ...currentSession,
      clockInTime: null,
    });
  }, [commitSession]);

  const showClockOutGuardMessage = useCallback(() => {
    setClockOutGuardMessage(CLOCK_OUT_GUARD_MESSAGE);
  }, []);

  const clearClockOutGuardMessage = useCallback(() => {
    setClockOutGuardMessage(null);
  }, []);

  const clearSession = useCallback(() => {
    sessionEpochRef.current += 1;
    clearAllSessionStorage();
    sessionRef.current = EMPTY_SESSION;
    storageKindRef.current = null;
    setSession(EMPTY_SESSION);
    setRequiresReauthentication(false);
    setClockOutGuardMessage(null);
  }, []);

  const acknowledgeReauthentication = useCallback(() => {
    setRequiresReauthentication(false);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      ...session,
      staffNumber: session.employeeNumber,
      clockOutGuardMessage,
      requiresReauthentication,
      startSession,
      setActiveRole,
      recordClockIn,
      recordClockOut,
      showClockOutGuardMessage,
      clearClockOutGuardMessage,
      clearSession,
      acknowledgeReauthentication,
    }),
    [
      acknowledgeReauthentication,
      clearClockOutGuardMessage,
      clearSession,
      clockOutGuardMessage,
      recordClockIn,
      recordClockOut,
      requiresReauthentication,
      session,
      setActiveRole,
      showClockOutGuardMessage,
      startSession,
    ],
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error(
      'useSession must be used within a SessionProvider.',
    );
  }

  return session;
}
