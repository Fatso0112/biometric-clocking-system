import { Briefcase, CalendarDays, Camera, CheckCircle2, Fingerprint, LogOut, Mail, Phone, User } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppShell from '../components/AppShell';
import Card from '../components/Card';
import ListItem from '../components/ListItem';
import NoticeBanner from '../components/NoticeBanner';
import ScreenHeader from '../components/ScreenHeader';
import { useEmployeeProfile } from '../context/EmployeeProfileContext';
import { useSession } from '../context/SessionContext';
import { useLogout } from '../hooks/useLogout';
import { getProfileOrigin, type ProfileNavigationState } from '../types/navigation';
import { MAX_PROFILE_IMAGE_BYTES, resizeProfileImage } from '../utils/profileImage';

type ProfileInfoRowProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function ProfileInfoRow({ icon, label, value }: ProfileInfoRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 sm:gap-2 sm:py-1">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-cream-white text-black sm:h-7 sm:w-7" aria-hidden="true">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-dark-grey">{label}</span>
        <span className="mt-1 block break-words text-sm font-semibold text-black">{value}</span>
      </span>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { staffNumber } = useSession();
  const { profile, removeAvatar, updateAvatar } = useEmployeeProfile();
  const logout = useLogout();
  const resolvedStaffNumber = staffNumber!;
  const profileFrom = getProfileOrigin(location.state);
  const routeMessage = (location.state as ProfileNavigationState | null)?.biometricUpdateMessage ?? null;
  const [biometricUpdateMessage] = useState(routeMessage);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (routeMessage) navigate('/profile', { replace: true, state: { from: profileFrom } });
  }, [navigate, profileFrom, routeMessage]);

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      input.value = '';
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setAvatarError('Please choose an image smaller than 2 MB.');
      input.value = '';
      return;
    }

    setAvatarError(null);
    setIsProcessingAvatar(true);

    try {
      updateAvatar(await resizeProfileImage(file));
    } catch {
      setAvatarError("We couldn't process this image. Please try another file.");
    } finally {
      setIsProcessingAvatar(false);
      input.value = '';
    }
  };

  const handleRemoveAvatar = () => {
    removeAvatar();
    setAvatarError(null);
  };

  return (
    <AppShell>
      <ScreenHeader title="My Profile" backTo={profileFrom} />

      <div className="mt-5 flex flex-col items-center text-center sm:mt-2">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-light-grey bg-white sm:h-12 sm:w-12">
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={`${profile.name} profile photo`}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-11 w-11 text-black sm:h-7 sm:w-7" strokeWidth={1.5} aria-hidden="true" />
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingAvatar}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-cream-white bg-black text-white disabled:cursor-not-allowed disabled:opacity-60 sm:h-7 sm:w-7"
            aria-label="Upload profile photo"
            aria-busy={isProcessingAvatar}
          >
            <Camera className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="sr-only"
            aria-label="Choose profile photo"
          />
        </div>
        <h1 className="mt-3 text-lg font-semibold sm:mt-1">{profile?.name ?? 'Loading…'}</h1>
        <span className="mt-2 inline-flex rounded-full bg-light-grey px-3 py-1 text-[11px] text-black sm:mt-1">
          Staff No: {profile?.staffNumber ?? resolvedStaffNumber}
        </span>
        {profile?.avatarUrl ? (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="mt-2 text-xs text-dark-grey underline underline-offset-2 hover:text-black"
          >
            Remove photo
          </button>
        ) : null}
        <p className="mt-2 min-h-4 text-xs text-dark-grey" role="alert" aria-live="polite">
          {avatarError}
        </p>
      </div>

      {biometricUpdateMessage ? (
        <NoticeBanner
          className="mt-5"
          icon={<CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />}
        >
          {biometricUpdateMessage}
        </NoticeBanner>
      ) : null}

      <Card className="mt-6 p-5 sm:mt-3 sm:p-4">
        <h2 className="text-lg font-semibold">Profile Information</h2>
        <div className="mt-3 divide-y divide-light-grey sm:mt-1">
          <ProfileInfoRow
            icon={<Briefcase className="h-5 w-5" strokeWidth={1.5} />}
            label="Department"
            value={profile?.department ?? '—'}
          />
          <ProfileInfoRow
            icon={<User className="h-5 w-5" strokeWidth={1.5} />}
            label="Position"
            value={profile?.position ?? '—'}
          />
          <ProfileInfoRow
            icon={<Mail className="h-5 w-5" strokeWidth={1.5} />}
            label="Email"
            value={profile?.email ?? '—'}
          />
          <ProfileInfoRow
            icon={<Phone className="h-5 w-5" strokeWidth={1.5} />}
            label="Phone"
            value={profile?.phone ?? '—'}
          />
        </div>
      </Card>

      <Card className="mt-5 p-5 sm:mt-3 sm:p-4">
        <h2 className="text-lg font-semibold">Actions</h2>
        <div className="mt-4 space-y-3 sm:mt-2 sm:space-y-2">
          <ListItem
            icon={<CalendarDays className="h-7 w-7" strokeWidth={1.5} />}
            title="ATTENDANCE REGISTER"
            subtitle="View your attendance history"
            onClick={() => navigate('/attendance-register', { state: { from: profileFrom } })}
            compactOnDesktop
          />
          <ListItem
            icon={<Fingerprint className="h-7 w-7" strokeWidth={1.5} />}
            title="UPDATE BIOMETRICS"
            subtitle="Update your fingerprint / face"
            onClick={() => navigate('/update-biometrics', { state: { from: profileFrom } })}
            compactOnDesktop
          />
          <ListItem
            icon={<LogOut className="h-7 w-7" strokeWidth={1.5} />}
            title="LOGOUT"
            subtitle="Logout from system"
            onClick={() => logout()}
            compactOnDesktop
          />
        </div>
      </Card>
    </AppShell>
  );
}
