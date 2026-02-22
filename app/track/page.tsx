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
          <h1 className="text-2xl font-bold">Track Case</h1>
          <div className="card space-y-3 p-4">
            <p className="text-sm text-slate-600">Case ID: {caseItem.caseId ?? caseItem.id}</p>
            <StatusBadge status={caseItem.status} />
            <p className="text-sm">
              Animal type (AI): <span className="font-semibold">{caseItem.ai?.animalType ?? 'other'}</span>
            </p>
            <p className="text-sm">Urgency: {caseItem.triage?.urgency ?? 'low'}</p>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold">AI welfare risk screening (not diagnosis)</p>
              {!caseItem.aiRisk ? <p className="mt-1 text-sm text-slate-600">Screening in progress...</p> : null}
              {caseItem.aiRisk ? (
                <div className="mt-2 space-y-1 text-sm">
                  <p>
                    Urgency suggestion: <span className="font-semibold">{caseItem.aiRisk.urgency}</span>
                  </p>
                  <p>Indicators: {(caseItem.aiRisk.visibleIndicators ?? []).join(', ') || 'none'}</p>
                  <p className="text-slate-600">{caseItem.aiRisk.disclaimer}</p>
                </div>
              ) : null}
            </div>
            <p className="text-sm text-slate-600">Assigned team: {caseItem.assignedTo || 'Not assigned yet'}</p>
            {caseItem.resolution ? <p className="text-sm">Resolution: {caseItem.resolution.outcome}</p> : null}
          </div>
        </section>
      ) : null}
    </PublicAccessGuard>
  );
}

