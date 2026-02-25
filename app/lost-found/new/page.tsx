"use client";

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import UploadDropzone from '@/components/UploadDropzone';
import { observeAuth } from '@/lib/auth';
import { createLostFoundPost, createLostFoundPostId, uploadLostFoundImage } from '@/lib/data';

export default function LostFoundCreatePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [petName, setPetName] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  useEffect(() => {
    const unsub = observeAuth((next) => {
      setUser(next);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  function onFilesChange(next: File[]) {
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
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      toast.error('Please sign in to post in Lost & Found.');
      return;
    }
    if (!files.length) {
      toast.error('Please upload at least one pet photo.');
      return;
    }
    if (!petName.trim()) {
      toast.error('Please enter your pet name.');
      return;
    }
    if (!contactInfo.trim()) {
      toast.error('Please enter your contact information.');
      return;
    }

    setSubmitting(true);
    try {
      const postId = await createLostFoundPostId();
      const uploadedPhotos = await Promise.all(files.map((file) => uploadLostFoundImage(postId, file)));
      await createLostFoundPost({
        id: postId,
        createdBy: user.uid,
        authorEmail: user.email ?? '',
        petName: petName.trim(),
        description: description.trim(),
        contactInfo: contactInfo.trim(),
        photoUrls: uploadedPhotos.map((item) => item.downloadUrl),
        photoPaths: uploadedPhotos.map((item) => item.storagePath),
      });
      toast.success('Lost pet post created.');
      setFiles([]);
      setPetName('');
      setDescription('');
      setContactInfo('');
    } catch {
      toast.error('Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-2xl space-y-4">
        <h1 className="page-title">Create Lost Pet Post</h1>
        <p className="page-subtitle">Share pet photos and contact details so people can reach you quickly.</p>

        <form onSubmit={onSubmit} className="card space-y-3 p-4">
          {authLoading ? <p className="text-xs text-muted">Checking sign-in status...</p> : null}
          {!authLoading && !user ? (
            <p className="text-xs text-muted">
              Please <Link href="/auth" className="link-inline">sign in</Link> to create a lost pet post.
            </p>
          ) : null}

          <UploadDropzone files={files} onFilesChange={onFilesChange} error={fileError} />

          <div>
            <label className="label">Pet name</label>
            <input className="input" value={petName} onChange={(event) => setPetName(event.target.value)} placeholder="Milo" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-24"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Color, collar, where last seen, special traits."
            />
          </div>
          <div>
            <label className="label">Contact information</label>
            <input
              className="input"
              value={contactInfo}
              onChange={(event) => setContactInfo(event.target.value)}
              placeholder="Phone, WhatsApp, or email"
            />
          </div>

          <div className="flex gap-2">
            <button className="btn-primary" type="submit" disabled={submitting || !user}>
              {submitting ? 'Posting...' : 'Post Lost Pet'}
            </button>
            <Link className="btn-ghost" href="/lost-found">
              Back to posts
            </Link>
          </div>
        </form>
      </section>
    </PublicAccessGuard>
  );
}