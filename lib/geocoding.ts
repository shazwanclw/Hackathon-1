export type LocationPoint = { lat: number; lng: number };

export type GeocodeResult = LocationPoint & {
  label: string;
};

type NominatimAddress = Partial<{
  road: string;
  pedestrian: string;
  neighbourhood: string;
  suburb: string;
  village: string;
  town: string;
  city: string;
  county: string;
  state: string;
  country: string;
}>;

type NominatimEntry = {
  lat?: string;
  lon?: string;
  display_name?: string;
  address?: NominatimAddress;
};

function getReadableAddressParts(address?: NominatimAddress) {
  if (!address) return [];
  const primary = address.road || address.pedestrian || address.neighbourhood;
  const locality = address.suburb || address.village;
  const city = address.city || address.town || address.county;
  const state = address.state;

  return [primary, locality, city, state].filter((part): part is string => Boolean(part && part.trim()));
}

export function buildLocationLabel(entry: NominatimEntry): string {
  const parts = getReadableAddressParts(entry.address);
  if (parts.length) return Array.from(new Set(parts)).join(', ');
  return String(entry.display_name ?? '').trim();
}

async function fetchNominatim(url: string): Promise<NominatimEntry | NominatimEntry[]> {
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding request failed (${response.status}).`);
  }

  return response.json();
}

export async function reverseGeocode(point: LocationPoint): Promise<GeocodeResult> {
  const params = new URLSearchParams({
    format: 'jsonv2',
    lat: String(point.lat),
    lon: String(point.lng),
    addressdetails: '1',
  });

  const raw = (await fetchNominatim(`https://nominatim.openstreetmap.org/reverse?${params}`)) as NominatimEntry;
  return {
    lat: point.lat,
    lng: point.lng,
    label: buildLocationLabel(raw),
  };
}

export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    format: 'jsonv2',
    q: trimmed,
    addressdetails: '1',
    limit: '5',
  });

  const raw = (await fetchNominatim(`https://nominatim.openstreetmap.org/search?${params}`)) as NominatimEntry[];

  return raw
    .map((item) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      return {
        lat,
        lng,
        label: buildLocationLabel(item),
      };
    })
    .filter((item): item is GeocodeResult => Boolean(item));
}