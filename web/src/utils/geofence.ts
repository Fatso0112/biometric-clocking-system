export type GeographicPoint = {
  latitude: number;
  longitude: number;
};

export type GeofenceConfig = {
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
};

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function getDistanceMeters(from: GeographicPoint, to: GeographicPoint) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function isWithinGeofence(position: GeographicPoint, config: GeofenceConfig) {
  return (
    getDistanceMeters(position, {
      latitude: config.centerLat,
      longitude: config.centerLng,
    }) <= config.radiusMeters
  );
}
