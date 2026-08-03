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
export interface CreateWorkLocationRequest {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  allowedRadiusMetres: number;
  maximumLocationAccuracyMetres: number;
  requireIpMatch: boolean;
  requireGeofence: boolean;
  timeZoneId: string;
}

export async function createWorkLocation(
  request: CreateWorkLocationRequest,
  accessToken: string,
): Promise<WorkLocationResponse> {
  return apiRequest<WorkLocationResponse>(
    '/api/v1/work-locations',
    {
      method: 'POST',
      body: JSON.stringify({
        name: request.name.trim(),
        address: request.address.trim(),
        latitude: request.latitude,
        longitude: request.longitude,
        allowedRadiusMetres:
          request.allowedRadiusMetres,
        maximumLocationAccuracyMetres:
          request.maximumLocationAccuracyMetres,
        requireIpMatch: request.requireIpMatch,
        requireGeofence: request.requireGeofence,
        timeZoneId: request.timeZoneId.trim(),
      }),
    },
    accessToken,
  );
}
