"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import UploadDropzone from '@/components/UploadDropzone';
import { generateCaptionDraftFromImage } from '@/lib/aiCaption';
import { observeAuth } from '@/lib/auth';
import { reverseGeocode } from '@/lib/geocoding';
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
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [locationMode, setLocationMode] = useState<LocationMode>('auto');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState('Detecting your current location...');
  const [locationLabel, setLocationLabel] = useState('');
  const [caption, setCaption] = useState('');
  const [captionDraftLoading, setCaptionDraftLoading] = useState(false);
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
      setLocationMessage('');
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

  useEffect(() => {
    let active = true;

    async function resolveLabel() {
      if (!location) {
        setLocationLabel('');
        return;
      }

      setLocationMessage('Looking up location name...');
      try {
        const result = await reverseGeocode(location);
        if (!active) return;
        setLocationLabel(result.label || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`);
        setLocationMessage('');
      } catch {
        if (!active) return;
        setLocationLabel('');
        setLocationMessage('Location selected.');
      }
    }

    resolveLabel();

    return () => {
      active = false;
    };
  }, [location]);

  async function handleFileChange(next: File[]) {
    setSubmitState(null);
    setCaptionDraftLoading(false);
    if (!next.length) {
      setFiles([]);
      setFileError('');
      return;
    }

    if (next.length > 3) {
      setFiles([]);
      setFileError('You can upload up to 3 photos only.');
      return;
    }

    const oversized = next.find((file) => file.size > 3 * 1024 * 1024);
    if (oversized) {
      setFiles([]);
      setFileError('File exceeds 3MB. Please upload a smaller image.');
      return;
    }

    setFiles(next);
    setFileError('');

    if (!user) return;

    if (!caption.trim()) {
      setCaptionDraftLoading(true);
      try {
        const generated = await generateCaptionDraftFromImage(next[0]);
        if (generated) {
          setCaption((current) => (current.trim() ? current : generated));
        }
      } catch {
        toast.error('Could not generate caption draft. You can still write your own caption.');
      } finally {
        setCaptionDraftLoading(false);
      }
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    if (!user) return toast.error('Please sign in to submit a sighting.');
    if (!files.length) return toast.error('Please upload at least one photo.');
    if (!location) return toast.error(locationMode === 'auto' ? 'Waiting for location detection. Please try again.' : 'Please pick a location on the map.');

    setLoading(true);
    setSubmitState(null);

    try {
      const animalId = await createAnimalId();
      const caseId = await createCaseId();
      const trackingToken = createTrackingToken();
      const uploadedPhotos = await Promise.all(files.map((file) => uploadCaseImage(caseId, file)));
      const photo = uploadedPhotos[0];
      if (!photo) {
        throw new Error('No uploaded photos available.');
      }
      const pendingAi = {
        model: 'gemini-pending',
        animalType: 'other' as const,
        confidence: 0,
        rawTopLabel: 'pending_gemini_classification',
      };

      await setCase(
        caseId,
        buildNewCasePayload({
          animalId,
          createdBy: user.uid,
          trackingToken,
          photo,
          location,
          note: caption.trim(),
          ai: pendingAi,
        })
      );

      const trackId = buildTrackId(caseId, trackingToken);
      await setPublicTrackSnapshot(trackId, {
        caseId,
        status: 'new',
        ai: {
          animalType: 'other',
          confidence: 0,
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
          animalType: 'other',
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
        changes: { animalType: 'other', confidence: 0 },
      });

      const created = await createAnimalWithFirstSighting({
        animalId,
        authorUid: user.uid,
        authorEmail: user.email ?? '',
        type: 'other',
        caption,
        photoUrl: photo.downloadUrl,
        photoPath: photo.storagePath,
        photoUrls: uploadedPhotos.map((item) => item.downloadUrl),
        photoPaths: uploadedPhotos.map((item) => item.storagePath),
        location,
      });

      toast.success('Post submitted. AI screening will continue in background.');
      setSubmitState({ ...created, caseId, trackingToken });
      setShowSuccessModal(true);
      setFiles([]);
      setLocation(null);
      setLocationLabel('');
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
      <div className="page-pet-bg-fixed" aria-hidden />
      <section className="relative z-10 mx-auto max-w-3xl space-y-6">
        <div className="card-elevated p-6 sm:p-8">
          <h1 className="page-title">Create a New Post</h1>
          <p className="page-subtitle mt-2 max-w-3xl">Each post saves a stray’s latest location and helps shelters and nearby people find, feed, and rescue animals faster.</p>
        </div>

        {authLoading ? <p className="text-sm text-muted">Checking sign-in status...</p> : null}

        {!authLoading && !user ? (
          <div className="card border-honey-300 bg-honey-100/80 p-4 text-sm text-brand-900">
            <p className="font-semibold">Sign-in required</p>
            <p>Please sign in to create posts.</p>
            <Link className="link-inline mt-2 inline-block" href="/auth">
              Go to auth
            </Link>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="card-elevated space-y-5 p-6">
            <div className="space-y-2">
              <p className="pill">Step 1</p>
              <h2 className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">Add clear photos</h2>
              <UploadDropzone files={files} onFilesChange={handleFileChange} error={fileError} capture="environment" />
            </div>

            <div>
              <p className="pill mb-2">Step 2</p>
              <label className="label">Caption</label>
              <textarea
                className="input min-h-28"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Seen near the bus stop around 7pm."
              />
              {captionDraftLoading ? <p className="mt-1 text-xs text-muted">Generating caption draft...</p> : null}
            </div>

            <div className="space-y-2 rounded-2xl border border-brand-300/70 bg-white/65 p-4">
              <p className="pill mb-2">Step 3</p>
              <label className="label">Post location</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={locationMode === 'auto' ? 'segment-active' : 'segment'}
                  onClick={() => setLocationMode('auto')}
                >
                  Auto detect
                </button>
                <button
                  type="button"
                  className={locationMode === 'manual' ? 'segment-active' : 'segment'}
                  onClick={() => setLocationMode('manual')}
                >
                  Manual
                </button>
              </div>
              {locationMessage ? <p className="text-xs text-muted">{locationMessage}</p> : null}
              {locationLabel ? <p className="text-xs text-muted">{locationLabel}</p> : null}
            </div>

            {locationMode === 'manual' ? (
              <div>
                <label className="label">Select location on map</label>
                <MapPicker value={location} onChange={setLocation} />
                <p className="mt-1 text-xs text-muted">Search or click map to place marker.</p>
              </div>
            ) : null}

            <div className="pt-1">
              <button disabled={loading || !user} className="btn-primary min-w-40" type="submit">
                {loading ? 'Submitting...' : 'Submit post'}
              </button>
            </div>
        </form>
      </section>

      {showSuccessModal && submitState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/45 p-4">
          <div className="card-elevated w-full max-w-md">
            <h2 className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">Post Submitted</h2>
            <p className="mt-2 text-sm text-muted">Your post was submitted. AI screening is running in the background.</p>
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
