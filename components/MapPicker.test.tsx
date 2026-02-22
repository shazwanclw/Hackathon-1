import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MapPicker from './MapPicker';

(globalThis as { React?: typeof React }).React = React;

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Marker: ({ icon }: { icon?: unknown }) => (
    <div data-testid="marker" data-has-icon={icon ? 'yes' : 'no'} />
  ),
  useMapEvents: () => ({}),
}));

describe('MapPicker', () => {
  it('uses an explicit marker icon when a manual location is selected', () => {
    render(<MapPicker value={{ lat: 3.1, lng: 101.6 }} onChange={vi.fn()} />);
    expect(screen.getByTestId('marker')).toHaveAttribute('data-has-icon', 'yes');
  });
});
