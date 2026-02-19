"use client";

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/StatusBadge';
import { ErrorState, LoadingState } from '@/components/States';
import { getPublicTrack } from '@/lib/data';

export default function TrackPage() {
  const params = useParams<{ caseId: string }>();
  const search = useSearchParams();
  const token = search.get('t');
  const caseId = params.caseId;

  const [loading, setLoading] = useState(true);
  const [caseItem, setCaseItem] = useState<any | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
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

  if (loading) return <LoadingState text="Loading case status..." />;
  if (error) return <ErrorState text={error} />;
  if (!caseItem) return <ErrorState text="Case not found." />;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">Track Case</h1>
      <div className="card space-y-3 p-4">
        <p className="text-sm text-slate-600">Case ID: {caseItem.id}</p>
        <StatusBadge status={caseItem.status} />
        <p className="text-sm">
          Animal type (AI): <span className="font-semibold">{caseItem.ai?.animalType ?? 'other'}</span>
        </p>
        <p className="text-sm">Urgency: {caseItem.triage?.urgency ?? 'low'}</p>
        <p className="text-sm text-slate-600">Assigned team: {caseItem.assignedTo || 'Not assigned yet'}</p>
        {caseItem.resolution ? <p className="text-sm">Resolution: {caseItem.resolution.outcome}</p> : null}
      </div>
    </section>
  );
}
