"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import UploadDropzone from '@/components/UploadDropzone';
import { observeAuth } from '@/lib/auth';
import {
  buildNewCasePayload,
  buildTrackId,
  createAnimalId,
  createCaseId,
  createAnimalWithFirstSighting,
  createTrackingToken,
  logCaseEvent,
  setCase,
  setPublicMapCase,
  setPublicTrackSnapshot,
  uploadCaseImage,
} from '@/lib/data';
import { classifyImage } from '@/lib/tf';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type SubmitState = {
  caseId: string;
  trackingToken: string;
  animalId: string;
  sightingId: string;
} | null;

type LocationMode = 'auto' | 'manual';

function getSubmitErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';

  if (code) return `Submit failed (${code}).`;
  if (message) return `Submit failed: ${message}`;
  return 'Failed to submit sighting. Please try again.';
}

function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

export default function ReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [locationMode, setLocationMode] = useState<LocationMode>('auto');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('Detecting your current location...');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const unsub = observeAuth((next) => {
      setUser(next);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  async function detectLocationWithFallback() {
    try {
      setLocationMessage('Detecting your current location...');
      const current = await getCurrentPosition();
      setLocation(current);
      setLocationMessage('Location detected from your device.');
    } catch {
      setLocationMode('manual');
      setLocationMessage('Auto-detect unavailable. Switched to manual mode. Please place marker on map.');
      toast.error('Could not auto-detect location. Switched to manual mode.');
    }
  }

  useEffect(() => {
    if (locationMode === 'auto') {
      detectLocationWithFallback();
    }
  }, [locationMode]);

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

    if (!user) return toast.error('Please sign in to submit a sighting.');
    if (!file) return toast.error('Please upload a photo.');
    if (!location) return toast.error(locationMode === 'auto' ? 'Waiting for location detection. Please try again.' : 'Please pick a location on the map.');

    setLoading(true);
    setSubmitState(null);

    try {
      const animalId = await createAnimalId();
      const caseId = await createCaseId();
      const trackingToken = createTrackingToken();
      const photo = await uploadCaseImage(caseId, file);
      const ai = await classifyImage(file);

      await setCase(
        caseId,
        buildNewCasePayload({
          animalId,
          createdBy: user.uid,
          trackingToken,
          photo,
          location,
          note: caption.trim(),
          ai,
        })
      );

      const trackId = buildTrackId(caseId, trackingToken);
      await setPublicTrackSnapshot(trackId, {
        caseId,
        status: 'new',
        ai: {
          animalType: ai.animalType,
          confidence: ai.confidence,
        },
        triage: {
          urgency: 'medium',
        },
        location,
        assignedTo: null,
        resolution: null,
      });
      await setPublicMapCase(caseId, {
        status: 'new',
        ai: {
          animalType: ai.animalType,
        },
        triage: {
          urgency: 'medium',
        },
        location,
      });
      await logCaseEvent({
        caseId,
        actorUid: user.uid,
        action: 'submitted',
        changes: { animalType: ai.animalType, confidence: ai.confidence },
      });

      const created = await createAnimalWithFirstSighting({
        animalId,
        authorUid: user.uid,
        type: ai.animalType,
        caption,
        photoUrl: photo.downloadUrl,
        photoPath: photo.storagePath,
        location,
      });

      toast.success('Sighting submitted. AI screening will continue in background.');
      setSubmitState({ ...created, caseId, trackingToken });
      setShowSuccessModal(true);
      setFile(null);
      setLocation(null);
      setCaption('');
      if (locationMode === 'auto') {
        detectLocationWithFallback();
      }
    } catch (err) {
      console.error(err);
      toast.error(getSubmitErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-2xl space-y-5">
        <h1 className="text-2xl font-bold">Submit a New Sighting</h1>
        <p className="text-sm text-slate-600">For MVP, each new sighting creates a new animal thread.</p>

        {authLoading ? <p className="text-sm text-slate-500">Checking sign-in status...</p> : null}

        {!authLoading && !user ? (
          <div className="card border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Sign-in required</p>
            <p>Please sign in to create sightings.</p>
            <Link className="mt-2 inline-block underline" href="/auth">
              Go to auth
            </Link>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <UploadDropzone file={file} onFileChange={handleFileChange} error={fileError} capture="environment" />

          <div className="space-y-2">
            <label className="label">Location mode</label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-md px-3 py-2 text-sm ${locationMode === 'auto' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setLocationMode('auto')}
              >
                Auto detect
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-2 text-sm ${locationMode === 'manual' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setLocationMode('manual')}
              >
                Manual
              </button>
            </div>
            <p className="text-xs text-slate-500">{locationMessage}</p>
            {location ? <p className="text-xs text-slate-500">Selected: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p> : null}
          </div>

          {locationMode === 'manual' ? (
            <div>
              <label className="label">Select location on map</label>
              <MapPicker value={location} onChange={setLocation} />
              <p className="mt-1 text-xs text-slate-500">Click map to place marker.</p>
            </div>
          ) : null}

          <div>
            <label className="label">Caption (optional)</label>
            <textarea
              className="input min-h-20"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Seen near the bus stop around 7pm."
            />
          </div>

          <button disabled={loading || !user} className="btn-primary" type="submit">
            {loading ? 'Submitting...' : 'Submit sighting'}
          </button>
        </form>
      </section>

      {showSuccessModal && submitState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Submission Successful</h2>
            <p className="mt-2 text-sm text-slate-700">Your report was submitted. AI screening is running in the background.</p>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>Case ID: {submitState.caseId}</p>
              <p>Animal ID: {submitState.animalId}</p>
            </div>
            <div className="mt-5 flex gap-2">
              <button className="btn-secondary" type="button" onClick={() => setShowSuccessModal(false)}>
                OK
              </button>
              <Link className="btn-primary" href={`/track?caseId=${submitState.caseId}&t=${submitState.trackingToken}`}>
                Track case
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </PublicAccessGuard>
  );
}
