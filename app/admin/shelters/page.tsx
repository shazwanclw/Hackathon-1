"use client";

import React, { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { listShelterProfiles, upsertShelterProfile } from '@/lib/data';
import { ShelterProfile } from '@/lib/types';

export default function SheltersAdminPage() {
  const [items, setItems] = useState<ShelterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [uid, setUid] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [shelterName, setShelterName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  async function loadShelters() {
    setLoading(true);
    setError('');
    try {
      const rows = await listShelterProfiles();
      setItems(rows);
    } catch {
      setError('Unable to load shelters right now.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShelters();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!uid.trim()) {
      toast.error('User UID is required.');
      return;
    }

    setSubmitting(true);
    try {
      await upsertShelterProfile({
        uid: uid.trim(),
        enabled,
        shelterName: shelterName.trim(),
        contactEmail: contactEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      toast.success('Shelter role saved.');
      await loadShelters();
      setUid('');
      setShelterName('');
      setContactEmail('');
      setPhone('');
      setAddress('');
      setEnabled(true);
    } catch {
      toast.error('Failed to save shelter role.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminGuard>
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="page-title">Shelter Role Management</h1>
            <p className="page-subtitle">Grant or revoke shelter posting access by Firebase Auth UID.</p>
          </div>
          <Link href="/admin/dashboard" className="btn-ghost">Back to Dashboard</Link>
        </div>

        <form className="card space-y-3 p-4" onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="shelter-uid">User UID</label>
            <input id="shelter-uid" className="input" value={uid} onChange={(event) => setUid(event.target.value)} placeholder="firebase-uid" />
          </div>

          <div>
            <label className="label" htmlFor="shelter-name">Shelter name</label>
            <input id="shelter-name" className="input" value={shelterName} onChange={(event) => setShelterName(event.target.value)} placeholder="Paws Shelter" />
          </div>

          <div>
            <label className="label" htmlFor="shelter-email">Contact email</label>
            <input id="shelter-email" className="input" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="contact@shelter.org" />
          </div>

          <div>
            <label className="label" htmlFor="shelter-phone">Phone</label>
            <input id="shelter-phone" className="input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+1 555 1234" />
          </div>

          <div>
            <label className="label" htmlFor="shelter-address">Address</label>
            <input id="shelter-address" className="input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Main St" />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-brand-900">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
            Shelter role enabled
          </label>

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Shelter Role'}
          </button>
        </form>

        {loading ? <LoadingState text="Loading shelter roles..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}
        {!loading && !error && items.length === 0 ? <EmptyState text="No shelter roles configured yet." /> : null}

        {!loading && !error && items.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((item) => (
              <article key={item.uid} className="card space-y-1 p-4 text-sm">
                <p className="font-semibold text-brand-900">{item.shelterName || '(No shelter name)'}</p>
                <p className="text-muted">UID: {item.uid}</p>
                <p className="text-brand-900">Email: {item.contactEmail || '-'}</p>
                <p className="text-brand-900">Phone: {item.phone || '-'}</p>
                <p className="text-brand-900">Address: {item.address || '-'}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">{item.enabled ? 'Enabled' : 'Disabled'}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </AdminGuard>
  );
}