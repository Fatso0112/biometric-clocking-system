import type { GeofenceConfig } from '../utils/geofence';

export type OfficeGeofence = GeofenceConfig & {
  id: string;
  name: string;
  address: {
    street: string;
    suburb: string;
    city: string;
    province: string;
    countryCode: string;
  };
};

// Frontend fallback for TUT Soshanguve South Campus. The backend should eventually return
// the active office and organisation-approved radius through getActiveOfficeGeofence().
export const OFFICE_GEOFENCE: OfficeGeofence = {
  id: 'tut-soshanguve-south',
  name: 'TUT Soshanguve South Campus',
  address: {
    street: '2 Aubrey Matlala Street',
    suburb: 'Soshanguve South',
    city: 'Soshanguve',
    province: 'Gauteng',
    countryCode: 'ZA',
  },
  centerLat: -25.5408,
  centerLng: 28.096156,
  radiusMeters: 200,
};
