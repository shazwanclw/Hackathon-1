"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import UploadDropzone from '@/components/UploadDropzone';
import { observeAuth } from '@/lib/auth';
import { createAnimalId, createAnimalWithFirstSighting, uploadSightingImage } from '@/lib/data';
import { AnimalType } from '@/lib/types';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

type SubmitState = {
  animalId: string;
  sightingId: string;
} | null;

function getSubmitErrorMessage(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';

  if (code) return `Submit failed (${code}).`;
  if (message) return `Submit failed: ${message}`;
  return 'Failed to submit sighting. Please try again.';
}

export default function ReportPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [type, setType] = useState<AnimalType>('cat');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>(null);

  useEffect(() => {
    const unsub = observeAuth((next) => {
      setUser(next);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

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
    if (!location) return toast.error('Please pick a location on the map.');

    setLoading(true);
    setSubmitState(null);

    try {
      const animalId = await createAnimalId();
      const photo = await uploadSightingImage(animalId, file);

      const created = await createAnimalWithFirstSighting({
        animalId,
        authorUid: user.uid,
        type,
        caption,
        photoUrl: photo.downloadUrl,
        photoPath: photo.storagePath,
        location,
      });

      toast.success('Sighting submitted.');
      setSubmitState(created);
      setFile(null);
      setLocation(null);
      setType('cat');
      setCaption('');
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

          <div>
            <label className="label">Select location on map</label>
            <MapPicker value={location} onChange={setLocation} />
            <p className="mt-1 text-xs text-slate-500">Click map to place marker.</p>
          </div>

          <div>
            <label className="label">Animal type</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as AnimalType)}>
              <option value="cat">Cat</option>
              <option value="dog">Dog</option>
              <option value="other">Other</option>
            </select>
          </div>

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

        {submitState ? (
          <div className="card border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
            <p className="font-semibold">Sighting saved</p>
            <p>Animal ID: {submitState.animalId}</p>
            <p>Sighting ID: {submitState.sightingId}</p>
            <Link className="mt-2 inline-block underline" href={`/animal?id=${submitState.animalId}`}>
              Open animal profile
            </Link>
          </div>
        ) : null}
      </section>
    </PublicAccessGuard>
  );
}
