import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getEmployeeProfile,
  type EmployeeDirectoryProfile,
  type EmployeeProfile,
} from '../services/employeeApi';
import {
  getItem,
  removeItem,
  setItem,
} from '../services/persistentStore';
import { useSession } from './SessionContext';

type EmployeeProfileContextValue = {
  profile: EmployeeProfile | null;
  updateAvatar: (dataUrl: string) => void;
  removeAvatar: () => void;
};

const EmployeeProfileContext =
  createContext<EmployeeProfileContextValue | null>(null);

function getAvatarStorageKey(staffNumber: string) {
  return `avatar:v1:${encodeURIComponent(staffNumber)}`;
}

function getStoredAvatar(staffNumber: string) {
  const savedAvatar = getItem<unknown>(
    getAvatarStorageKey(staffNumber),
    'local',
  );

  return typeof savedAvatar === 'string' &&
    savedAvatar.startsWith('data:image/')
    ? savedAvatar
    : null;
}

export function EmployeeProfileProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    staffNumber,
    employeeId,
    accessToken,
    firstName,
    lastName,
    email,
  } = useSession();

  const [profile, setProfile] =
    useState<EmployeeProfile | null>(null);

  useEffect(() => {
    if (!employeeId || !accessToken) {
      setProfile(null);
      return;
    }

    let active = true;
    setProfile(null);

    void getEmployeeProfile(accessToken)
      .then((baseProfile) => {
        if (!active) return;

        setProfile({
          ...baseProfile,
          avatarUrl: getStoredAvatar(
            baseProfile.staffNumber,
          ),
        });
      })
      .catch(() => {
        if (!active || !staffNumber) return;

        setProfile({
          name:
            `${firstName ?? ''} ${lastName ?? ''}`.trim() ||
            'Employee',
          staffNumber,
          department: '—',
          position: 'Employee',
          email: email ?? '—',
          phone: '—',
          avatarUrl: getStoredAvatar(staffNumber),
        });
      });

    return () => {
      active = false;
    };
  }, [
    accessToken,
    email,
    employeeId,
    firstName,
    lastName,
    staffNumber,
  ]);

  const updateAvatar = useCallback(
    (dataUrl: string) => {
      const resolvedStaffNumber =
        profile?.staffNumber ?? staffNumber;

      if (!resolvedStaffNumber) return;

      setItem(
        getAvatarStorageKey(resolvedStaffNumber),
        dataUrl,
        'local',
      );

      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              avatarUrl: dataUrl,
            }
          : currentProfile,
      );
    },
    [profile?.staffNumber, staffNumber],
  );

  const removeAvatar = useCallback(() => {
    const resolvedStaffNumber =
      profile?.staffNumber ?? staffNumber;

    if (!resolvedStaffNumber) return;

    removeItem(
      getAvatarStorageKey(resolvedStaffNumber),
      'local',
    );

    setProfile((currentProfile) =>
      currentProfile
        ? {
            ...currentProfile,
            avatarUrl: null,
          }
        : currentProfile,
    );
  }, [profile?.staffNumber, staffNumber]);

  const value = useMemo(
    () => ({
      profile,
      updateAvatar,
      removeAvatar,
    }),
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
    throw new Error(
      'useEmployeeProfile must be used within an EmployeeProfileProvider.',
    );
  }

  return context;
}
