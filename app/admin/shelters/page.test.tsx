import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SheltersAdminPage from './page';
import { listShelterProfiles, upsertShelterProfile } from '@/lib/data';

vi.mock('@/components/AdminGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/data', () => ({
  listShelterProfiles: vi.fn(),
  upsertShelterProfile: vi.fn(),
}));

describe('Admin shelters page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listShelterProfiles).mockResolvedValue([] as never);
    vi.mocked(upsertShelterProfile).mockResolvedValue(undefined as never);
  });

  it('submits shelter role by uid', async () => {
    render(<SheltersAdminPage />);

    fireEvent.change(screen.getByLabelText(/user uid/i), { target: { value: 'user-123' } });
    fireEvent.change(screen.getByLabelText(/shelter name/i), { target: { value: 'Paws Shelter' } });
    fireEvent.change(screen.getByLabelText(/contact email/i), { target: { value: 'paws@example.com' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '+1 555 2222' } });
    fireEvent.change(screen.getByLabelText(/address/i), { target: { value: '12 Main St' } });

    fireEvent.click(screen.getByRole('button', { name: /save shelter role/i }));

    await waitFor(() => {
      expect(upsertShelterProfile).toHaveBeenCalledWith({
        uid: 'user-123',
        enabled: true,
        shelterName: 'Paws Shelter',
        contactEmail: 'paws@example.com',
        phone: '+1 555 2222',
        address: '12 Main St',
      });
    });
  });
});