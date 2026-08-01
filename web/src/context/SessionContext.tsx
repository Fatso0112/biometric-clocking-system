import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { StorageKind } from '../services/persistentStore';
import {
  clearAllSessionStorage,
  EMPTY_SESSION,
  hydrateSession,
  persistSession,
  type SessionData,
} from '../services/sessionPersistence';
import type { AuthenticatedIdentity, UserRole } from '../types/session';

export interface SessionState extends SessionData {
  /** Compatibility alias for existing Employee/Supervisor consumers. Not persisted. */
  staffNumber: string | null;
}

type SessionContextValue = SessionState & {
  clockOutGuardMessage: string | null;
  requiresReauthentication: boolean;
  startSession: (identity: AuthenticatedIdentity, rememberMe: boolean) => void;
  setActiveRole: (role: UserRole) => void;
  recordClockIn: (clockInTime: Date) => void;
  recordClockOut: () => void;
  showClockOutGuardMessage: () => void;
  clearClockOutGuardMessage: () => void;
  clearSession: () => void;
  acknowledgeReauthentication: () => void;
};

const CLOCK_OUT_GUARD_MESSAGE = 'You need to clock in before you can clock out.';

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const [hydratedSession] = useState(hydrateSession);
  const [session, setSession] = useState<SessionData>(hydratedSession.session);
  const sessionRef = useRef(hydratedSession.session);
  const storageKindRef = useRef<StorageKind | null>(hydratedSession.storageKind);
  const [requiresReauthentication, setRequiresReauthentication] = useState(
    hydratedSession.requiresReauthentication,
  );
  const [clockOutGuardMessage, setClockOutGuardMessage] = useState<string | null>(null);

  const commitSession = useCallback((nextSession: SessionData, storageKind = storageKindRef.current) => {
    sessionRef.current = nextSession;
    storageKindRef.current = storageKind;
    if (storageKind) persistSession(nextSession, storageKind);
    setSession(nextSession);
  }, []);

  const startSession = useCallback((identity: AuthenticatedIdentity, rememberMe: boolean) => {
    const storageKind: StorageKind = rememberMe ? 'local' : 'session';
    commitSession({ ...identity, clockInTime: null }, storageKind);
    setRequiresReauthentication(false);
    setClockOutGuardMessage(null);
  }, [commitSession]);

  const setActiveRole = useCallback((role: UserRole) => {
    const currentSession = sessionRef.current;
    if (!currentSession.authorizedRoles.includes(role)) return;
    commitSession({ ...currentSession, activeRole: role });
  }, [commitSession]);

  const recordClockIn = useCallback((clockInTime: Date) => {
    const currentSession = sessionRef.current;
    commitSession({ ...currentSession, clockInTime });
    setClockOutGuardMessage(null);
  }, [commitSession]);

  const recordClockOut = useCallback(() => {
    const currentSession = sessionRef.current;
    commitSession({ ...currentSession, clockInTime: null });
  }, [commitSession]);

  const showClockOutGuardMessage = useCallback(() => {
    setClockOutGuardMessage(CLOCK_OUT_GUARD_MESSAGE);
  }, []);

  const clearClockOutGuardMessage = useCallback(() => {
    setClockOutGuardMessage(null);
  }, []);

  const clearSession = useCallback(() => {
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

  const value = useMemo(
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

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error('useSession must be used within a SessionProvider.');
  }

  return session;
}
