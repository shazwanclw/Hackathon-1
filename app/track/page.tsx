"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import StatusBadge from '@/components/StatusBadge';
import { ErrorState, LoadingState } from '@/components/States';
import { getPublicTrack } from '@/lib/data';

export default function TrackPage() {
  const search = useSearchParams();
  const token = search.get('t');
  const caseId = search.get('caseId');

  const [loading, setLoading] = useState(true);
  const [caseItem, setCaseItem] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!caseId) {
        setError('Case id is missing.');
        setLoading(false);
        return;
      }
      if (!token) {
        setError('Tracking token is missing.');
        setLoading(false);
        return;
      }

      try {
        const data = await getPublicTrack(caseId, token);
        if (!data) {
          setError('Case not found or token does not match.');
          setLoading(false);
          return;
        }
        if (!cancelled) setCaseItem(data);
      } catch {
        if (!cancelled) setError('Failed to load case.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [caseId, token]);

  return (
    <PublicAccessGuard>
      {loading ? <LoadingState text="Loading case status..." /> : null}
      {!loading && error ? <ErrorState text={error} /> : null}
      {!loading && !error && !caseItem ? <ErrorState text="Case not found." /> : null}
      {!loading && !error && caseItem ? (
        <section className="mx-auto max-w-xl space-y-4">
          <h1 className="page-title">Track Case</h1>
          <div className="card space-y-3 p-4">
            <p className="text-sm text-muted">Case ID: {caseItem.caseId ?? caseItem.id}</p>
            <StatusBadge status={caseItem.status} />
            <p className="text-sm text-brand-900">
              Animal type (AI): <span className="font-semibold">{caseItem.ai?.animalType ?? 'other'}</span>
            </p>
            <p className="text-sm text-brand-900">Urgency: {caseItem.triage?.urgency ?? 'low'}</p>
            <div className="rounded-xl border border-brand-300 bg-brand-100/55 p-3">
              <p className="text-sm font-semibold text-brand-900">AI welfare risk screening (not diagnosis)</p>
              {!caseItem.aiRisk ? <p className="mt-1 text-sm text-muted">Screening in progress...</p> : null}
              {caseItem.aiRisk ? (
                <div className="mt-2 space-y-1 text-sm text-brand-900">
                  <p>
                    Urgency suggestion: <span className="font-semibold">{caseItem.aiRisk.urgency}</span>
                  </p>
                  <p>Indicators: {(caseItem.aiRisk.visibleIndicators ?? []).join(', ') || 'none'}</p>
                  <p className="text-muted">{caseItem.aiRisk.disclaimer}</p>
                </div>
              ) : null}
            </div>
            <p className="text-sm text-muted">Assigned team: {caseItem.assignedTo || 'Not assigned yet'}</p>
            {caseItem.resolution ? <p className="text-sm text-brand-900">Resolution: {caseItem.resolution.outcome}</p> : null}
          </div>
        </section>
      ) : null}
    </PublicAccessGuard>
  );
}