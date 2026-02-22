import Link from 'next/link';
import StatusBadge from './StatusBadge';

export default function CaseCard({ caseItem, admin = true }: { caseItem: any; admin?: boolean }) {
  const href = admin
    ? `/admin/case/${caseItem.id}`
    : `/track?caseId=${caseItem.id}${caseItem.trackingToken ? `&t=${caseItem.trackingToken}` : ''}`;
  return (
    <Link href={href} className="card block p-4 hover:-translate-y-0.5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="font-semibold text-brand-900">Case #{caseItem.id}</p>
        <StatusBadge status={caseItem.status} />
      </div>
      <p className="text-sm text-muted">
        {caseItem.ai?.animalType ?? 'other'} • urgency {caseItem.triage?.urgency ?? 'low'}
      </p>
      <p className="mt-1 text-xs text-brand-800/70">
        {(caseItem.location?.lat ?? 0).toFixed(4)}, {(caseItem.location?.lng ?? 0).toFixed(4)}
      </p>
    </Link>
  );
}