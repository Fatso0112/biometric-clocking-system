import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import type { LoginNavigationState } from '../types/navigation';

export function useLogout() {
  const navigate = useNavigate();
  const { clearSession } = useSession();

  return useCallback(
    (noticeMessage?: string) => {
      const state: LoginNavigationState | null = noticeMessage ? { noticeMessage } : null;
      clearSession();
      navigate('/', { replace: true, state });
    },
    [clearSession, navigate],
  );
}
