import {
  LocateFixed,
  MapPin,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  PortalActionButton,
  PortalField,
  PortalNotice,
  PortalPageHeader,
  PortalPanel,
  PortalStatus,
  PortalTable,
  portalInputClass,
  portalTdClass,
  portalThClass,
} from '../../components/portal/PortalUi';
import { useSession } from '../../context/SessionContext';
import { ApiError } from '../../services/httpClient';
import {
  createWorkLocation,
  getWorkLocations,
  type WorkLocationResponse,
} from '../../services/workLocationsApi';

interface WorkLocationForm {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  allowedRadiusMetres: string;
  maximumLocationAccuracyMetres: string;
  timeZoneId: string;
  requireGeofence: boolean;
  requireIpMatch: boolean;
}

const EMPTY_FORM: WorkLocationForm = {
  name: '',
  address: '',
  latitude: '',
  longitude: '',
  allowedRadiusMetres: '250',
  maximumLocationAccuracyMetres: '150',
  timeZoneId: 'Africa/Johannesburg',
  requireGeofence: true,
  requireIpMatch: false,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Your login session has expired. Please log in again.';
    }

    if (error.status === 403) {
      return 'Only a system administrator may manage work locations.';
    }

    if (error.errors) {
      const messages = Object.values(error.errors).flat();
      if (messages.length > 0) return messages.join(' ');
    }

    return error.message;
  }

  return error instanceof Error
    ? error.message
    : 'The work-location request failed.';
}

function parseCoordinate(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function AdminWorkLocations() {
  const { accessToken } = useSession();
  const [locations, setLocations] = useState<WorkLocationResponse[]>([]);
  const [form, setForm] = useState<WorkLocationForm>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);

  const loadLocations = useCallback(async () => {
    if (!accessToken) {
      setMessage({
        text: 'No authenticated session was found. Please log in again.',
        error: true,
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      setLocations(await getWorkLocations(accessToken));
    } catch (error) {
      setMessage({ text: getErrorMessage(error), error: true });
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  function updateField<K extends keyof WorkLocationForm>(
    field: K,
    value: WorkLocationForm[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage(null);
  }

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage({
        text: 'This browser does not support geolocation.',
        error: true,
      });
      return;
    }

    setIsLocating(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((current) => ({
          ...current,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
          maximumLocationAccuracyMetres: String(
            Math.max(
              Number(current.maximumLocationAccuracyMetres) || 0,
              Math.ceil(position.coords.accuracy),
            ),
          ),
        }));
        setIsLocating(false);
      },
      (error) => {
        setMessage({
          text:
            error.code === error.PERMISSION_DENIED
              ? 'Location permission was denied.'
              : 'The current location could not be captured.',
          error: true,
        });
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15_000,
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PortalPageHeader
        title="Work locations"
        description="Create the live geofence used by the backend when validating attendance events."
        actions={
          <PortalActionButton
            tone="secondary"
            onClick={() => void loadLocations()}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </PortalActionButton>
        }
      />

      {message ? (
        <PortalNotice tone={message.error ? 'error' : 'success'}>
          {message.text}
        </PortalNotice>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <PortalPanel>
          <PortalTable>
            <thead>
              <tr>
                <th className={portalThClass}>Location</th>
                <th className={portalThClass}>Geofence</th>
                <th className={portalThClass}>IP rule</th>
                <th className={portalThClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center text-sm text-dark-grey">
                    Loading work locations…
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center text-sm text-dark-grey">
                    No work locations have been created yet.
                  </td>
                </tr>
              ) : (
                locations.map((location) => (
                  <tr key={location.id}>
                    <td className={portalTdClass}>
                      <p className="font-semibold">{location.name}</p>
                      <p className="mt-1 text-xs text-dark-grey">{location.address}</p>
                    </td>
                    <td className={portalTdClass}>
                      {location.requireGeofence
                        ? `${location.allowedRadiusMetres} m radius`
                        : 'Disabled'}
                    </td>
                    <td className={portalTdClass}>
                      {location.requireIpMatch ? 'Required' : 'Not required'}
                    </td>
                    <td className={portalTdClass}>
                      <PortalStatus value={location.isActive ? 'Active' : 'Inactive'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </PortalTable>
        </PortalPanel>

        <PortalPanel className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-card bg-light-grey">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold">Add work location</h2>
              <p className="mt-1 text-xs text-dark-grey">Use the real office coordinates.</p>
            </div>
          </div>

          <form
            className="mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage(null);

              if (!accessToken) {
                setMessage({
                  text: 'Your login session is unavailable. Please log in again.',
                  error: true,
                });
                return;
              }

              const latitude = parseCoordinate(form.latitude);
              const longitude = parseCoordinate(form.longitude);
              const radius = Number(form.allowedRadiusMetres);
              const accuracy = Number(form.maximumLocationAccuracyMetres);

              if (
                !form.name.trim() ||
                !form.address.trim() ||
                (form.requireGeofence &&
                  (latitude === null || longitude === null)) ||
                !Number.isFinite(radius) ||
                radius <= 0 ||
                !Number.isFinite(accuracy) ||
                accuracy <= 0
              ) {
                setMessage({
                  text: 'Complete the required fields with valid coordinates, radius and accuracy.',
                  error: true,
                });
                return;
              }

              setIsSaving(true);

              try {
                await createWorkLocation(
                  {
                    name: form.name,
                    address: form.address,
                    latitude,
                    longitude,
                    allowedRadiusMetres: radius,
                    maximumLocationAccuracyMetres: accuracy,
                    requireIpMatch: form.requireIpMatch,
                    requireGeofence: form.requireGeofence,
                    timeZoneId: form.timeZoneId,
                  },
                  accessToken,
                );

                setForm(EMPTY_FORM);
                setMessage({
                  text: 'Work location created successfully.',
                  error: false,
                });
                await loadLocations();
              } catch (error) {
                setMessage({ text: getErrorMessage(error), error: true });
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <PortalField label="Location name">
              <input
                required
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                className={portalInputClass}
                placeholder="Pretoria Head Office"
              />
            </PortalField>

            <PortalField label="Address">
              <input
                required
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
                className={portalInputClass}
                placeholder="Pretoria, Gauteng"
              />
            </PortalField>

            <div className="grid grid-cols-2 gap-3">
              <PortalField label="Latitude">
                <input
                  inputMode="decimal"
                  value={form.latitude}
                  onChange={(event) => updateField('latitude', event.target.value)}
                  className={portalInputClass}
                  placeholder="-25.7479"
                />
              </PortalField>
              <PortalField label="Longitude">
                <input
                  inputMode="decimal"
                  value={form.longitude}
                  onChange={(event) => updateField('longitude', event.target.value)}
                  className={portalInputClass}
                  placeholder="28.2293"
                />
              </PortalField>
            </div>

            <PortalActionButton
              type="button"
              tone="secondary"
              onClick={captureCurrentLocation}
              disabled={isLocating}
              className="w-full"
            >
              <LocateFixed className="h-4 w-4" />
              {isLocating ? 'Locating…' : 'Use current location'}
            </PortalActionButton>

            <div className="grid grid-cols-2 gap-3">
              <PortalField label="Radius (m)">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={form.allowedRadiusMetres}
                  onChange={(event) => updateField('allowedRadiusMetres', event.target.value)}
                  className={portalInputClass}
                />
              </PortalField>
              <PortalField label="Max GPS accuracy (m)">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={form.maximumLocationAccuracyMetres}
                  onChange={(event) => updateField('maximumLocationAccuracyMetres', event.target.value)}
                  className={portalInputClass}
                />
              </PortalField>
            </div>

            <PortalField label="Timezone">
              <input
                required
                value={form.timeZoneId}
                onChange={(event) => updateField('timeZoneId', event.target.value)}
                className={portalInputClass}
              />
            </PortalField>

            <div className="space-y-3 rounded-card border border-light-grey p-4 text-sm">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.requireGeofence}
                  onChange={(event) => updateField('requireGeofence', event.target.checked)}
                  className="h-4 w-4"
                />
                Require geofence match
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.requireIpMatch}
                  onChange={(event) => updateField('requireIpMatch', event.target.checked)}
                  className="h-4 w-4"
                />
                Require approved network
              </label>
              <p className="text-xs leading-5 text-dark-grey">
                Leave approved-network matching off for the hosted MVP unless the office CIDR ranges are configured.
              </p>
            </div>

            <PortalActionButton
              type="submit"
              disabled={isSaving}
              className="w-full"
            >
              <Plus className="h-4 w-4" />
              {isSaving ? 'Saving…' : 'Create location'}
            </PortalActionButton>
          </form>
        </PortalPanel>
      </div>
    </div>
  );
}
