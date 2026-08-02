import { apiRequest } from './httpClient';

export interface WorkLocationResponse {
  id: string;
  name: string;
  address: string;

  latitude: number | null;
  longitude: number | null;

  allowedRadiusMetres: number;
  maximumLocationAccuracyMetres: number;

  requireIpMatch: boolean;
  requireGeofence: boolean;

  timeZoneId: string;
  isActive: boolean;

  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export async function getWorkLocations(
  accessToken: string,
): Promise<WorkLocationResponse[]> {
  return apiRequest<WorkLocationResponse[]>(
    '/api/v1/work-locations',
    {
      method: 'GET',
    },
    accessToken,
  );
}