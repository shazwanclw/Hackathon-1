import { describe, expect, it, vi, afterEach } from 'vitest';
import { buildLocationLabel, reverseGeocode, searchLocations } from '@/lib/geocoding';

describe('geocoding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a readable label from address parts', () => {
    const label = buildLocationLabel({
      display_name: 'Persiaran Kewajipan, Subang Jaya, Selangor, Malaysia',
      address: {
        road: 'Persiaran Kewajipan',
        suburb: 'USJ 1',
        city: 'Subang Jaya',
        state: 'Selangor',
      },
    });

    expect(label).toBe('Persiaran Kewajipan, USJ 1, Subang Jaya, Selangor');
  });

  it('falls back to display name when detailed address is unavailable', () => {
    const label = buildLocationLabel({
      display_name: 'Subang Jaya, Selangor, Malaysia',
      address: {},
    });

    expect(label).toBe('Subang Jaya, Selangor, Malaysia');
  });

  it('maps reverse geocode response into label + coordinates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          lat: '3.0803',
          lon: '101.5839',
          display_name: 'SS15, Subang Jaya, Selangor, Malaysia',
          address: {
            neighbourhood: 'SS15',
            town: 'Subang Jaya',
            state: 'Selangor',
          },
        }),
      })
    );

    const result = await reverseGeocode({ lat: 3.0803, lng: 101.5839 });

    expect(result).toEqual({
      lat: 3.0803,
      lng: 101.5839,
      label: 'SS15, Subang Jaya, Selangor',
    });
  });

  it('maps search response into selectable locations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: '3.0763',
            lon: '101.5879',
            display_name: 'Empire Shopping Gallery, Subang Jaya, Selangor, Malaysia',
            address: {
              road: 'Jalan SS 16/1',
              city: 'Subang Jaya',
              state: 'Selangor',
            },
          },
        ],
      })
    );

    const results = await searchLocations('Empire Shopping Gallery');

    expect(results).toEqual([
      {
        lat: 3.0763,
        lng: 101.5879,
        label: 'Jalan SS 16/1, Subang Jaya, Selangor',
      },
    ]);
  });
});