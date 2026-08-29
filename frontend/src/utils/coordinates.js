export function normalizePlaceCoordinates(place) {
  const lat = Number(place?.lat ?? place?.latitude);
  const lon = Number(place?.lon ?? place?.lng ?? place?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { ...place, lat, lon };
}
