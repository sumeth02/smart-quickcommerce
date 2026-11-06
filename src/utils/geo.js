const EARTH_RADIUS_KM = 6371;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Great-circle distance between two {lat, lng} points, in km. */
export function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  );
}

/**
 * Nearest open dark store whose delivery radius covers the point.
 * Returns { store, distanceKm } or null when the address is out of range (SRS §1.2: 2-3 km).
 */
export function findNearestStore(stores, point) {
  let best = null;
  for (const store of stores) {
    if (!store.isOpen) continue;
    const d = distanceKm(point, store);
    if (d <= store.radiusKm && (!best || d < best.distanceKm)) {
      best = { store, distanceKm: Math.round(d * 100) / 100 };
    }
  }
  return best;
}
