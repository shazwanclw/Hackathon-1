import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('Home page', () => {
  it('shows only login/join call to action', () => {
    render(<HomePage />);
    expect(screen.getByRole('link', { name: /login \/ join/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /submit a report/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /admin login/i })).not.toBeInTheDocument();
  });
});
