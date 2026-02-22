"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { serverTimestamp } from 'firebase/firestore';
import AdminGuard from '@/components/AdminGuard';
import StatusBadge from '@/components/StatusBadge';
import { ErrorState, LoadingState } from '@/components/States';
import { auth } from '@/lib/firebase';
import { buildAiRiskAdminOverride, buildTrackId, getCaseById, logCaseEvent, updateCase, updatePublicMapCase, updatePublicTrackSnapshot } from '@/lib/data';
import { AnimalType, ResolutionOutcome, RiskAnimalType, Urgency } from '@/lib/types';

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
  const [overrideUrgency, setOverrideUrgency] = useState<Urgency>('medium');
  const [overrideAnimalType, setOverrideAnimalType] = useState<RiskAnimalType | ''>('');
  const [overrideNote, setOverrideNote] = useState('');

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
      setOverrideUrgency((data.aiRisk as any)?.adminOverride?.urgency ?? (data.aiRisk as any)?.urgency ?? 'medium');
      setOverrideAnimalType((data.aiRisk as any)?.adminOverride?.animalType ?? '');
      setOverrideNote((data.aiRisk as any)?.adminOverride?.note ?? '');
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
      await updatePublicMapCase(caseId, {
        status: 'verified',
        ai: { animalType },
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
      await updatePublicMapCase(caseId, {
        status: 'assigned',
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
      await updatePublicMapCase(caseId, {
        status: 'resolved',
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
      await updatePublicMapCase(caseId, {
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

  async function overrideAiRisk() {
    if (!item) return;
    const adminUid = auth.currentUser?.uid ?? null;
    if (!adminUid) return toast.error('Admin session missing');

    try {
      setSaving(true);
      const nextAnimalType = overrideAnimalType || null;
      await updateCase(caseId, {
        'aiRisk.adminOverride': buildAiRiskAdminOverride({
          overridden: true,
          urgency: overrideUrgency,
          animalType: nextAnimalType,
          note: overrideNote.trim() || null,
          overriddenBy: adminUid,
          overriddenAt: serverTimestamp(),
        }),
        'triage.urgency': overrideUrgency,
        'triage.source': 'admin',
      });

      await logCaseEvent({
        caseId,
        actorUid: adminUid,
        action: 'ADMIN_OVERRIDE_AI_RISK',
        changes: {
          urgency: overrideUrgency,
          animalType: nextAnimalType,
          note: overrideNote.trim() || null,
        },
      });

      await updatePublicTrackSnapshot(buildTrackId(caseId, item.trackingToken), {
        triage: { urgency: overrideUrgency },
        aiRisk: {
          ...(item.aiRisk ?? {}),
          adminOverride: {
            overridden: true,
            urgency: overrideUrgency,
            animalType: nextAnimalType,
            note: overrideNote.trim() || null,
            overriddenBy: adminUid,
          },
        },
      });

      await updatePublicMapCase(caseId, {
        triage: { urgency: overrideUrgency },
      });

      toast.success('AI risk override saved');
      await refresh();
    } catch {
      toast.error('Override failed');
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

          <div className="card space-y-3 p-4">
            <h2 className="text-lg font-semibold">AI welfare risk screening (not diagnosis)</h2>
            {!item.aiRisk ? <p className="text-sm text-slate-600">Screening in progress...</p> : null}
            {item.aiRisk ? (
              <>
                <p className="text-sm text-slate-700">Suggested urgency: {item.aiRisk.urgency}</p>
                <p className="text-sm text-slate-700">Animal type: {item.aiRisk.animalType}</p>
                <p className="text-sm text-slate-700">Indicators: {(item.aiRisk.visibleIndicators ?? []).join(', ') || 'none'}</p>
                <p className="text-sm text-slate-600">{item.aiRisk.disclaimer}</p>
              </>
            ) : null}
          </div>

          <div className="card grid gap-3 p-4 md:grid-cols-2">
            <h2 className="md:col-span-2 text-lg font-semibold">Admin override AI risk</h2>
            <select className="input" value={overrideUrgency} onChange={(e) => setOverrideUrgency(e.target.value as Urgency)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select className="input" value={overrideAnimalType} onChange={(e) => setOverrideAnimalType((e.target.value as RiskAnimalType) || '')}>
              <option value="">No override</option>
              <option value="cat">Cat</option>
              <option value="dog">Dog</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
            <input
              className="input md:col-span-2"
              placeholder="Override note (optional)"
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
            />
            <button className="btn-primary md:col-span-2" disabled={saving} type="button" onClick={overrideAiRisk}>
              Save AI risk override
            </button>
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
