import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MapView from './MapView';

(globalThis as { React?: typeof React }).React = React;

const push = vi.fn();
const closePopup = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
  }),
}));

vi.mock('leaflet', () => ({
  default: {
    icon: vi.fn(() => ({ type: 'icon' })),
    divIcon: vi.fn(() => ({ type: 'div-icon' })),
    heatLayer: vi.fn(() => ({ id: 'heat-layer' })),
  },
}));

vi.mock('leaflet.heat', () => ({}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({
    closePopup,
    removeLayer: vi.fn(),
  }),
}));

describe('MapView', () => {
  beforeEach(() => {
    push.mockReset();
    closePopup.mockReset();
  });

  it('shows marker popup actions and routes only when learn more is clicked', () => {
    render(
      <MapView
        cases={[
          {
            id: 'animal-1',
            type: 'cat',
            aiRiskReasonPreview: 'Visible limping and patchy fur.',
            location: { lat: 3.14, lng: 101.69 },
          },
        ]}
      />
    );

    expect(screen.getByText(/ai note \(preview\):/i)).toHaveTextContent('Visible limping and patchy fur...');

    const notifyButton = screen.getByRole('button', { name: /notify shelter/i });
    expect(notifyButton).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(notifyButton);
    expect(notifyButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /go!/i }));
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /back to map/i }));
    expect(closePopup).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /learn more/i }));
    expect(push).toHaveBeenCalledWith('/animal?id=animal-1');
  });
});
