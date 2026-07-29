import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface SessionState {
  staffNumber: string | null;
  clockInTime: Date | null;
}

type SessionContextValue = SessionState & {
  clockOutGuardMessage: string | null;
  startSession: (staffNumber: string) => void;
  recordClockIn: (clockInTime: Date) => void;
  recordClockOut: () => void;
  showClockOutGuardMessage: () => void;
  clearClockOutGuardMessage: () => void;
  clearSession: () => void;
};

const CLOCK_OUT_GUARD_MESSAGE = 'You need to clock in before you can clock out.';

const initialSessionState: SessionState = {
  staffNumber: null,
  clockInTime: null,
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
};

export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<SessionState>(initialSessionState);
  const [clockOutGuardMessage, setClockOutGuardMessage] = useState<string | null>(null);

  const startSession = useCallback((staffNumber: string) => {
    setSession({ staffNumber, clockInTime: null });
    setClockOutGuardMessage(null);
  }, []);

  const recordClockIn = useCallback((clockInTime: Date) => {
    setSession((currentSession) => ({ ...currentSession, clockInTime }));
    setClockOutGuardMessage(null);
  }, []);

  const recordClockOut = useCallback(() => {
    setSession((currentSession) => ({ ...currentSession, clockInTime: null }));
  }, []);

  const showClockOutGuardMessage = useCallback(() => {
    setClockOutGuardMessage(CLOCK_OUT_GUARD_MESSAGE);
  }, []);

  const clearClockOutGuardMessage = useCallback(() => {
    setClockOutGuardMessage(null);
  }, []);

  const clearSession = useCallback(() => {
    setSession(initialSessionState);
    setClockOutGuardMessage(null);
  }, []);

  const value = useMemo(
    () => ({
      ...session,
      clockOutGuardMessage,
      startSession,
      recordClockIn,
      recordClockOut,
      showClockOutGuardMessage,
      clearClockOutGuardMessage,
      clearSession,
    }),
    [
      clearClockOutGuardMessage,
      clearSession,
      clockOutGuardMessage,
      recordClockIn,
      recordClockOut,
      session,
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
