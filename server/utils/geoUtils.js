/**
 * Parse lat/lng from common Google Maps URL shapes.
 * Returns { latitude, longitude } or null.
 */
export const parseCoordinatesFromMapsUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const patterns = [
    /[?&]q=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /[?&]ll=(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,|\/|$)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)
      && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
      return { latitude, longitude };
    }
  }

  return null;
};

export const normalizeCoordinates = (coords) => {
  if (!coords) return null;
  const latitude = Number(coords.latitude ?? coords.lat);
  const longitude = Number(coords.longitude ?? coords.lng ?? coords.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
};

/** Stable hash from string → unsigned 32-bit */
const hashSeed = (seed) => {
  const str = String(seed || '');
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Approximate pin for privacy (~200–500 m offset, deterministic per seed).
 */
export const approximateCoordinates = (latitude, longitude, seed) => {
  const h = hashSeed(seed);
  const angle = ((h % 360) * Math.PI) / 180;
  const distMeters = 200 + (h % 301); // 200–500 m
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((latitude * Math.PI) / 180);
  const dLat = (distMeters / metersPerDegLat) * Math.cos(angle);
  const dLng = metersPerDegLng === 0
    ? 0
    : (distMeters / metersPerDegLng) * Math.sin(angle);

  return {
    latitude: Number((latitude + dLat).toFixed(6)),
    longitude: Number((longitude + dLng).toFixed(6)),
  };
};

/**
 * Resolve coords from explicit body fields or a maps URL.
 */
export const resolveCoordinates = ({ coordinates, googleMapsUrl } = {}) => {
  const explicit = normalizeCoordinates(coordinates);
  if (explicit) return explicit;
  return parseCoordinatesFromMapsUrl(googleMapsUrl);
};

/** Build a Google Maps URL from exact coordinates (or fall back to an existing URL). */
export const mapsUrlFromLocation = ({ coordinates, googleMapsUrl } = {}) => {
  const coords = normalizeCoordinates(coordinates);
  if (coords) {
    return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
  }
  const url = String(googleMapsUrl || '').trim();
  return url || null;
};

/** Public-safe location: approximate pin only (no exact door / maps URL). */
export const toPublicLocation = ({ coordinates, googleMapsUrl, seed } = {}) => {
  const exact = resolveCoordinates({ coordinates, googleMapsUrl });
  if (!exact) return { coordinates: null, googleMapsUrl: '' };
  const approx = approximateCoordinates(exact.latitude, exact.longitude, seed);
  return {
    coordinates: approx,
    googleMapsUrl: '',
  };
};
