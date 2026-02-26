"use client";

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import UploadDropzone from '@/components/UploadDropzone';
import { isUserAdmin, isUserShelter, observeAuth } from '@/lib/auth';
import { createAdoptionPost, createAdoptionPostId, getShelterProfileByUid, uploadAdoptionImage } from '@/lib/data';
import { PetType } from '@/lib/types';

export default function AdoptionCreatePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<PetType>('dog');
  const [ageText, setAgeText] = useState('');
  const [description, setDescription] = useState('');
  const [shelterName, setShelterName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const unsub = observeAuth((next) => {
      setUser(next);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!user) {
        setAllowed(false);
        return;
      }

      const [admin, shelter] = await Promise.all([isUserAdmin(user.uid), isUserShelter(user.uid)]);
      if (!cancelled) {
        setAllowed(admin || shelter);
      }

      if (shelter && !admin) {
        const profile = await getShelterProfileByUid(user.uid);
        if (!cancelled && profile) {
          setShelterName(profile.shelterName);
          setContactEmail(profile.contactEmail || user.email || '');
          setPhone(profile.phone);
          setAddress(profile.address);
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  function onFilesChange(next: File[]) {
    if (!next.length) {
      setFiles([]);
      setFileError('');
      return;
    }
    if (next.length > 1) {
      setFiles([]);
      setFileError('Please upload only one photo for adoption profile.');
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
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !allowed) {
      toast.error('Only admin or shelter roles can create adoption posts.');
      return;
    }
    if (!files.length) {
      toast.error('Please upload a pet photo.');
      return;
    }
    if (!petName.trim() || !shelterName.trim() || !contactEmail.trim()) {
      toast.error('Please complete required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const postId = await createAdoptionPostId();
      const uploaded = await uploadAdoptionImage(postId, files[0]);
      await createAdoptionPost({
        id: postId,
        createdBy: user.uid,
        createdByEmail: user.email ?? '',
        shelterUid: user.uid,
        shelterName: shelterName.trim(),
        petName: petName.trim(),
        petType,
        ageText: ageText.trim(),
        description: description.trim(),
        photoUrl: uploaded.downloadUrl,
        photoPath: uploaded.storagePath,
        contactEmail: contactEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
        status: 'available',
      });
      toast.success('Adoption post created.');
      setFiles([]);
      setPetName('');
      setAgeText('');
      setDescription('');
    } catch {
      toast.error('Failed to create adoption post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-2xl space-y-4">
        <h1 className="page-title">Create Adoption Post</h1>
        <p className="page-subtitle">Only admin and shelter accounts can publish adoptable pet listings.</p>

        <form onSubmit={onSubmit} className="card space-y-3 p-4">
          {authLoading ? <p className="text-xs text-muted">Checking sign-in status...</p> : null}
          {!authLoading && !user ? (
            <p className="text-xs text-muted">Please <Link href="/auth" className="link-inline">sign in</Link> to continue.</p>
          ) : null}
          {!authLoading && user && !allowed ? (
            <p className="text-xs text-muted">Your account does not have shelter or admin role access.</p>
          ) : null}

          <UploadDropzone files={files} onFilesChange={onFilesChange} error={fileError} />

          <div>
            <label className="label">Pet name</label>
            <input className="input" value={petName} onChange={(event) => setPetName(event.target.value)} placeholder="Milo" />
          </div>

          <div>
            <label className="label">Pet type</label>
            <select className="input" value={petType} onChange={(event) => setPetType(event.target.value as PetType)}>
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="label">Age</label>
            <input className="input" value={ageText} onChange={(event) => setAgeText(event.target.value)} placeholder="2 years" />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Behavior, health notes, and temperament." />
          </div>

          <div>
            <label className="label">Shelter name</label>
            <input className="input" value={shelterName} onChange={(event) => setShelterName(event.target.value)} placeholder="Paws Shelter" />
          </div>

          <div>
            <label className="label">Contact email</label>
            <input className="input" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contact@shelter.org" />
          </div>

          <div>
            <label className="label">Phone</label>
            <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 1234" />
          </div>

          <div>
            <label className="label">Address</label>
            <input className="input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Main St" />
          </div>

          <div className="flex gap-2">
            <button className="btn-primary" type="submit" disabled={submitting || !allowed}>
              {submitting ? 'Posting...' : 'Create Adoption Post'}
            </button>
            <Link className="btn-ghost" href="/adoption">
              Back to Adoption
            </Link>
          </div>
        </form>
      </section>
    </PublicAccessGuard>
  );
}