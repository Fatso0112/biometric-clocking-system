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
import {
  getEmployeeProfile,
  type EmployeeDirectoryProfile,
  type EmployeeProfile,
} from '../services/employeeApi';
import { getItem, removeItem, setItem } from '../services/persistentStore';
import { useSession } from './SessionContext';

type EmployeeProfileContextValue = {
  profile: EmployeeProfile | null;
  updateAvatar: (dataUrl: string) => void;
  removeAvatar: () => void;
};

type ProfileRequest = {
  staffNumber: string;
  promise: Promise<EmployeeDirectoryProfile>;
};

const EmployeeProfileContext = createContext<EmployeeProfileContextValue | null>(null);

function getAvatarStorageKey(staffNumber: string) {
  return `avatar:v1:${encodeURIComponent(staffNumber)}`;
}

function getStoredAvatar(staffNumber: string) {
  const savedAvatar = getItem<unknown>(getAvatarStorageKey(staffNumber), 'local');
  return typeof savedAvatar === 'string' && savedAvatar.startsWith('data:image/')
    ? savedAvatar
    : null;
}

export function EmployeeProfileProvider({ children }: { children: ReactNode }) {
  const { staffNumber } = useSession();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const profileRequestRef = useRef<ProfileRequest | null>(null);

  useEffect(() => {
    if (!staffNumber) {
      profileRequestRef.current = null;
      setProfile(null);
      return;
    }

    let active = true;
    setProfile(null);

    const existingRequest = profileRequestRef.current;
    const request =
      existingRequest?.staffNumber === staffNumber
        ? existingRequest.promise
        : getEmployeeProfile(staffNumber);

    profileRequestRef.current = { staffNumber, promise: request };

    void request.then((baseProfile) => {
      if (!active) return;
      setProfile({ ...baseProfile, avatarUrl: getStoredAvatar(staffNumber) });
    });

    return () => {
      active = false;
    };
  }, [staffNumber]);

  const updateAvatar = useCallback(
    (dataUrl: string) => {
      if (!staffNumber) return;
      setItem(getAvatarStorageKey(staffNumber), dataUrl, 'local');
      setProfile((currentProfile) =>
        currentProfile ? { ...currentProfile, avatarUrl: dataUrl } : currentProfile,
      );
    },
    [staffNumber],
  );

  const removeAvatar = useCallback(() => {
    if (!staffNumber) return;
    removeItem(getAvatarStorageKey(staffNumber), 'local');
    setProfile((currentProfile) =>
      currentProfile ? { ...currentProfile, avatarUrl: null } : currentProfile,
    );
  }, [staffNumber]);

  const value = useMemo(
    () => ({ profile, updateAvatar, removeAvatar }),
    [profile, removeAvatar, updateAvatar],
  );

  return (
    <EmployeeProfileContext.Provider value={value}>
      {children}
    </EmployeeProfileContext.Provider>
  );
}

export function useEmployeeProfile() {
  const context = useContext(EmployeeProfileContext);

  if (!context) {
    throw new Error('useEmployeeProfile must be used within an EmployeeProfileProvider.');
  }

  return context;
}
