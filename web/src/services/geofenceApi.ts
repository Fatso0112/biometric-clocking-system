import { OFFICE_GEOFENCE, type OfficeGeofence } from '../config/geofence';
import type { IntendedClockAction } from '../types/navigation';

export interface ActiveOfficeGeofenceRequest {
  staffNumber: string;
  intendedAction: IntendedClockAction;
}

export interface ActiveOfficeGeofenceResponse {
  geofence: OfficeGeofence;
}

export async function getActiveOfficeGeofence(
  request: ActiveOfficeGeofenceRequest,
): Promise<OfficeGeofence> {
  // MOCK IMPLEMENTATION — replace only this function when the backend is ready. Suggested
  // contract: GET /api/geofences/active?staffNumber=...&intendedAction=clockIn|clockOut
  // returning { geofence: OfficeGeofence }. The backend can then select an office per employee,
  // shift, or action without requiring any change to LocationCheck.tsx.
  //
  // const params = new URLSearchParams(request);
  // const response = await fetch(
  //   `${import.meta.env.VITE_API_BASE_URL}/api/geofences/active?${params}`,
  // );
  // if (!response.ok) throw new Error('Unable to load the active office geofence.');
  // return ((await response.json()) as ActiveOfficeGeofenceResponse).geofence;
  void request;
  return OFFICE_GEOFENCE;
}
