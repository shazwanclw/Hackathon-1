import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MapPicker from './MapPicker';

(globalThis as { React?: typeof React }).React = React;
const setView = vi.fn();

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ icon }: { icon?: unknown }) => (
    <div data-testid="marker" data-has-icon={icon ? 'yes' : 'no'} />
  ),
  useMapEvents: () => ({}),
  useMap: () => ({
    setView,
  }),
}));

describe('MapPicker', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    setView.mockReset();
  });

  it('uses an explicit marker icon when a manual location is selected', () => {
    render(<MapPicker value={{ lat: 3.1, lng: 101.6 }} onChange={vi.fn()} />);
    expect(screen.getByTestId('marker')).toHaveAttribute('data-has-icon', 'yes');
    expect(setView).toHaveBeenCalled();
  });

  it('supports searching a place and selecting a result', async () => {
    const onChange = vi.fn();
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

    render(<MapPicker value={null} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/search location/i), {
      target: { value: 'Empire Shopping Gallery' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

    const result = await screen.findByRole('button', {
      name: /jalan ss 16\/1, subang jaya, selangor/i,
    });
    fireEvent.click(result);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ lat: 3.0763, lng: 101.5879 });
    });
  });
});
