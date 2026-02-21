"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AdminGuard from '@/components/AdminGuard';
import StatusBadge from '@/components/StatusBadge';
import { ErrorState, LoadingState } from '@/components/States';
import { auth } from '@/lib/firebase';
import { buildTrackId, getCaseById, logCaseEvent, updateCase, updatePublicTrackSnapshot } from '@/lib/data';
import { AnimalType, ResolutionOutcome, Urgency } from '@/lib/types';

export default function AdminCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;

  const [item, setItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [animalType, setAnimalType] = useState<AnimalType>('other');
  const [urgency, setUrgency] = useState<Urgency>('medium');
  const [triageReason, setTriageReason] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [resolutionOutcome, setResolutionOutcome] = useState<ResolutionOutcome>('unknown');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await getCaseById(caseId);
    setItem(data);
    if (data) {
      setAnimalType((data.ai as any)?.animalType ?? 'other');
      setUrgency((data.triage as any)?.urgency ?? 'medium');
      setTriageReason((data.triage as any)?.reason ?? '');
      setAssignedTo((data.assignedTo as string | undefined) ?? '');
      setResolutionOutcome((data.resolution as any)?.outcome ?? 'unknown');
      setResolutionNotes((data.resolution as any)?.notes ?? '');
    }
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function verifyCase(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    try {
      setSaving(true);
      await updateCase(caseId, {
        'ai.animalType': animalType,
        'triage.urgency': urgency,
        'triage.reason': triageReason,
        status: 'verified',
      });
      await logCaseEvent({
        caseId,
        actorUid: auth.currentUser?.uid ?? null,
        action: 'verified',
        changes: { animalType, urgency, triageReason },
      });
      await updatePublicTrackSnapshot(buildTrackId(caseId, item.trackingToken), {
        status: 'verified',
        ai: { animalType, confidence: item.ai?.confidence ?? 0 },
        triage: { urgency },
      });
      toast.success('Case verified');
      await refresh();
    } catch {
      toast.error('Verification failed');
    } finally {
      setSaving(false);
    }
  }

  async function assignCase() {
    if (!item) return;
    if (!assignedTo.trim()) return toast.error('Enter team member name');
    try {
      setSaving(true);
      await updateCase(caseId, { assignedTo: assignedTo.trim(), status: 'assigned' });
      await logCaseEvent({
        caseId,
        actorUid: auth.currentUser?.uid ?? null,
        action: 'assigned',
        changes: { assignedTo: assignedTo.trim() },
      });
      await updatePublicTrackSnapshot(buildTrackId(caseId, item.trackingToken), {
        status: 'assigned',
        assignedTo: assignedTo.trim(),
      });
      toast.success('Case assigned');
      await refresh();
    } catch {
      toast.error('Assignment failed');
    } finally {
      setSaving(false);
    }
  }

  async function resolveCase() {
    if (!item) return;
    try {
      setSaving(true);
      const { serverTimestamp } = await import('firebase/firestore');
      await updateCase(caseId, {
        status: 'resolved',
        resolution: {
          outcome: resolutionOutcome,
          notes: resolutionNotes,
          resolvedAt: serverTimestamp(),
        },
      });
      await logCaseEvent({
        caseId,
        actorUid: auth.currentUser?.uid ?? null,
        action: 'resolved',
        changes: { resolutionOutcome, resolutionNotes },
      });
      await updatePublicTrackSnapshot(buildTrackId(caseId, item.trackingToken), {
        status: 'resolved',
        resolution: { outcome: resolutionOutcome, notes: resolutionNotes },
      });
      toast.success('Case resolved');
      await refresh();
    } catch {
      toast.error('Resolve failed');
    } finally {
      setSaving(false);
    }
  }

  async function rejectCase() {
    if (!item) return;
    try {
      setSaving(true);
      await updateCase(caseId, { status: 'rejected' });
      await logCaseEvent({
        caseId,
        actorUid: auth.currentUser?.uid ?? null,
        action: 'rejected',
        changes: {},
      });
      await updatePublicTrackSnapshot(buildTrackId(caseId, item.trackingToken), {
        status: 'rejected',
      });
      toast.success('Case rejected');
      await refresh();
    } catch {
      toast.error('Reject failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminGuard>
      {loading ? <LoadingState text="Loading case..." /> : null}
      {!loading && !item ? <ErrorState text="Case not found" /> : null}

      {item ? (
        <section className="space-y-4">
          <div className="card space-y-3 p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Case #{item.id}</h1>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-slate-600">AI: {item.ai?.animalType ?? 'other'} ({item.ai?.confidence ?? 0})</p>
            <p className="text-sm text-slate-600">Location: {(item.location?.lat ?? 0).toFixed(5)}, {(item.location?.lng ?? 0).toFixed(5)}</p>
            <p className="text-sm text-slate-600">Immediate danger: {item.report?.immediateDanger ? 'Yes' : 'No'}</p>
          </div>

          <form onSubmit={verifyCase} className="card grid gap-3 p-4 md:grid-cols-2">
            <h2 className="md:col-span-2 text-lg font-semibold">Verify Case</h2>
            <select className="input" value={animalType} onChange={(e) => setAnimalType(e.target.value as AnimalType)}>
              <option value="cat">Cat</option>
              <option value="dog">Dog</option>
              <option value="other">Other</option>
            </select>
            <select className="input" value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input className="input md:col-span-2" placeholder="Triage reason" value={triageReason} onChange={(e) => setTriageReason(e.target.value)} />
            <button className="btn-primary md:col-span-2" disabled={saving} type="submit">Set Verified</button>
          </form>

          <div className="card grid gap-3 p-4 md:grid-cols-2">
            <h2 className="md:col-span-2 text-lg font-semibold">Assign Case</h2>
            <input className="input" placeholder="Team member name" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
            <button className="btn-primary" disabled={saving} type="button" onClick={assignCase}>Assign</button>
          </div>

          <div className="card grid gap-3 p-4 md:grid-cols-2">
            <h2 className="md:col-span-2 text-lg font-semibold">Resolve or Reject</h2>
            <select className="input" value={resolutionOutcome} onChange={(e) => setResolutionOutcome(e.target.value as ResolutionOutcome)}>
              <option value="rescued">Rescued</option>
              <option value="treated">Treated</option>
              <option value="relocated">Relocated</option>
              <option value="false_report">False report</option>
              <option value="unknown">Unknown</option>
            </select>
            <input className="input" placeholder="Resolution notes" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
            <button className="btn-primary" disabled={saving} type="button" onClick={resolveCase}>Resolve</button>
            <button className="btn-secondary" disabled={saving} type="button" onClick={rejectCase}>Reject</button>
          </div>
        </section>
      ) : null}
    </AdminGuard>
  );
}
