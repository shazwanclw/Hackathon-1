"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import UploadDropzone from '@/components/UploadDropzone';
import { classifyImage } from '@/lib/tf';
import {
  buildTrackId,
  createCaseId,
  createTrackingToken,
  getSessionId,
  logCaseEvent,
  setCase,
  setPublicTrackSnapshot,
  uploadCaseImage,
} from '@/lib/data';
import { BehaviorType, CountEstimate } from '@/lib/types';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type SubmitState = {
  caseId: string;
  token: string;
} | null;

export default function ReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressText, setAddressText] = useState('');
  const [count, setCount] = useState<CountEstimate>('1');
  const [behavior, setBehavior] = useState<BehaviorType>('unknown');
  const [immediateDanger, setImmediateDanger] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>(null);

  const trackHref = useMemo(() => {
    if (!submitState) return '#';
    return `/track/${submitState.caseId}?t=${submitState.token}`;
  }, [submitState]);

  function handleFileChange(next: File | null) {
    setSubmitState(null);
    if (!next) {
      setFile(null);
      setFileError('');
      return;
    }

    if (next.size > 3 * 1024 * 1024) {
      setFile(null);
      setFileError('File exceeds 3MB. Please upload a smaller image.');
      return;
    }

    setFile(next);
    setFileError('');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!file) return toast.error('Please upload a photo.');
    if (!location) return toast.error('Please pick a location on the map.');

    setLoading(true);
    setSubmitState(null);

    try {
      const caseId = await createCaseId();
      const token = createTrackingToken();
      const sessionId = getSessionId();

      const photo = await uploadCaseImage(caseId, file);
      const ai = await classifyImage(file);

      await setCase(caseId, {
        createdBy: sessionId,
        trackingToken: token,
        photo,
        location: {
          lat: location.lat,
          lng: location.lng,
          addressText,
          accuracy: 'exact',
        },
        report: {
          count,
          behavior,
          immediateDanger,
          note,
        },
        ai: {
          model: 'tfjs-mobilenet',
          animalType: ai.animalType,
          confidence: ai.confidence,
          rawTopLabel: ai.rawTopLabel,
        },
        triage: {
          urgency: immediateDanger ? 'high' : 'medium',
          reason: immediateDanger ? 'Reporter marked immediate danger.' : 'Awaiting admin review.',
          needsHumanVerification: true,
        },
        status: 'new',
        assignedTo: null,
        resolution: null,
      });

      const trackId = buildTrackId(caseId, token);
      await setPublicTrackSnapshot(trackId, {
        caseId,
        status: 'new',
        ai: {
          animalType: ai.animalType,
          confidence: ai.confidence,
        },
        triage: {
          urgency: immediateDanger ? 'high' : 'medium',
        },
        assignedTo: null,
        resolution: null,
      });

      await logCaseEvent({
        caseId,
        actorUid: null,
        action: 'created',
        changes: { source: 'public_report' },
      });

      await logCaseEvent({
        caseId,
        actorUid: null,
        action: 'ai_tagged',
        changes: { animalType: ai.animalType, confidence: ai.confidence, rawTopLabel: ai.rawTopLabel },
      });

      toast.success('Report submitted successfully. Save your tracking link.');
      setSubmitState({ caseId, token });
      setFile(null);
      setAddressText('');
      setLocation(null);
      setCount('1');
      setBehavior('unknown');
      setImmediateDanger(false);
      setNote('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold">Submit a Stray Animal Report</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <UploadDropzone file={file} onFileChange={handleFileChange} error={fileError} />

        <div>
          <label className="label">Select location on map</label>
          <MapPicker value={location} onChange={setLocation} />
          <p className="mt-1 text-xs text-slate-500">Click map to place marker.</p>
        </div>

        <div>
          <label className="label">Optional address text</label>
          <input className="input" placeholder="Near Main St & 3rd Ave" value={addressText} onChange={(e) => setAddressText(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Count estimate</label>
            <select className="input" value={count} onChange={(e) => setCount(e.target.value as CountEstimate)}>
              <option value="1">1</option>
              <option value="2-3">2-3</option>
              <option value="many">Many</option>
            </select>
          </div>
          <div>
            <label className="label">Behavior</label>
            <select className="input" value={behavior} onChange={(e) => setBehavior(e.target.value as BehaviorType)}>
              <option value="calm">Calm</option>
              <option value="aggressive">Aggressive</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={immediateDanger} onChange={(e) => setImmediateDanger(e.target.checked)} />
          Immediate danger
        </label>

        <div>
          <label className="label">Note (optional)</label>
          <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any context that helps responders." />
        </div>

        <button disabled={loading} className="btn-primary" type="submit">
          {loading ? 'Submitting...' : 'Submit report'}
        </button>
      </form>

      {submitState ? (
        <div className="card border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <p className="font-semibold">Report saved</p>
          <p>Case ID: {submitState.caseId}</p>
          <p>Tracking token: {submitState.token}</p>
          <Link className="mt-2 inline-block underline" href={trackHref}>
            Open tracking page
          </Link>
        </div>
      ) : null}
    </section>
  );
}
