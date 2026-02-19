import { CaseStatus } from '@/lib/types';

const styles: Record<CaseStatus, string> = {
  new: 'bg-sky-100 text-sky-800',
  verified: 'bg-violet-100 text-violet-800',
  assigned: 'bg-amber-100 text-amber-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

export default function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${styles[status]}`}>{status}</span>;
}
