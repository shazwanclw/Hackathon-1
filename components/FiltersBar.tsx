import { AnimalType, CaseStatus, Urgency } from '@/lib/types';

type Props = {
  status: CaseStatus | 'all';
  urgency: Urgency | 'all';
  animalType: AnimalType | 'all';
  onChange: (key: 'status' | 'urgency' | 'animalType', value: string) => void;
};

export default function FiltersBar({ status, urgency, animalType, onChange }: Props) {
  return (
    <div className="card grid gap-3 p-4 sm:grid-cols-3">
      <select className="input" value={status} onChange={(e) => onChange('status', e.target.value)}>
        <option value="all">All statuses</option>
        <option value="new">New</option>
        <option value="verified">Verified</option>
        <option value="assigned">Assigned</option>
        <option value="resolved">Resolved</option>
        <option value="rejected">Rejected</option>
      </select>
      <select className="input" value={urgency} onChange={(e) => onChange('urgency', e.target.value)}>
        <option value="all">All urgency</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <select className="input" value={animalType} onChange={(e) => onChange('animalType', e.target.value)}>
        <option value="all">All animal types</option>
        <option value="cat">Cat</option>
        <option value="dog">Dog</option>
        <option value="other">Other</option>
      </select>
    </div>
  );
}