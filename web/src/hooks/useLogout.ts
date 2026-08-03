import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { revokeAuthentication } from '../services/authApi';
import type { LoginNavigationState } from '../types/navigation';

export function useLogout() {
  const navigate = useNavigate();
  const { clearSession, refreshToken } = useSession();

  return useCallback(
    (noticeMessage?: string) => {
      const tokenToRevoke = refreshToken;
      const state: LoginNavigationState | null =
        noticeMessage
          ? { noticeMessage }
          : null;

      clearSession();
      navigate('/', {
        replace: true,
        state,
      });

      if (tokenToRevoke) {
        void revokeAuthentication(tokenToRevoke);
      }
    },
    [clearSession, navigate, refreshToken],
  );
}
