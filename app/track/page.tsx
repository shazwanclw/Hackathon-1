"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import StatusBadge from '@/components/StatusBadge';
import { ErrorState, LoadingState } from '@/components/States';
import { getPublicTrack } from '@/lib/data';

export const dynamic = 'force-dynamic';

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function TrackPageContent() {
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
            <StatusBadge status={caseItem.status} />
            <p className="text-sm text-brand-900">
              Animal type (AI): <span className="font-semibold">{caseItem.ai?.animalType ?? 'other'}</span>
            </p>
            <p className="text-sm text-brand-900">Urgency: {caseItem.triage?.urgency ?? 'low'}</p>
            <div className="rounded-2xl border border-brand-300 bg-brand-100/55 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-brand-900">AI welfare risk screening</p>
                {caseItem.aiRisk?.urgency ? (
                  <span className="rounded-full border border-brand-400/70 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                    Urgency: {caseItem.aiRisk.urgency}
                  </span>
                ) : null}
              </div>
              {!caseItem.aiRisk ? <p className="mt-1 text-sm text-muted">Screening in progress...</p> : null}
              {caseItem.aiRisk ? (
                <div className="mt-2 space-y-2 text-sm text-brand-900">
                  {caseItem.aiRisk.reason ? (
                    <div className="space-y-1 rounded-xl border border-brand-200/80 bg-white/75 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">AI Notes</p>
                      {splitIntoSentences(caseItem.aiRisk.reason).map((line, idx) => (
                        <p key={`${line}-${idx}`} className="text-sm text-brand-900">
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-brand-200/80 bg-white/75 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">AI Accuracy Level</p>
                      <p className="text-lg font-semibold text-brand-900">{Math.round((caseItem.aiRisk.confidence || 0) * 100)}%</p>
                    </div>
                    <div className="rounded-xl border border-brand-200/80 bg-white/75 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Visible indicators</p>
                      <p className="text-sm text-brand-900">{(caseItem.aiRisk.visibleIndicators ?? []).join(', ') || 'none'}</p>
                    </div>
                  </div>
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

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <PublicAccessGuard>
          <LoadingState text="Loading case status..." />
        </PublicAccessGuard>
      }
    >
      <TrackPageContent />
    </Suspense>
  );
}
