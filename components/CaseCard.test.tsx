import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CaseCard from './CaseCard';

(globalThis as { React?: typeof React }).React = React;

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe('CaseCard', () => {
  it('links admin cards through static-safe caseId query', () => {
    render(
      <CaseCard
        caseItem={{
          id: 'abc123',
          status: 'new',
          location: { lat: 3.14, lng: 101.69 },
        }}
      />
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '/admin/case?caseId=abc123');
  });

  it('renders when coordinates are stored as strings', () => {
    render(
      <CaseCard
        caseItem={{
          id: 'case-1',
          status: 'new',
          location: { lat: '3.1401', lng: '101.6932' },
          ai: { animalType: 'cat' },
          triage: { urgency: 'high' },
        }}
      />
    );

    expect(screen.getByText('Case #case-1')).toBeInTheDocument();
    expect(screen.getByText('3.1401, 101.6932')).toBeInTheDocument();
  });
});
