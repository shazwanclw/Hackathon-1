"use client";

import React from 'react';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { getAnimalById, listAnimalSightings } from '@/lib/data';
import { reverseGeocode } from '@/lib/geocoding';
import { AnimalProfile, AnimalSightingItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseLatLng(label: string): { lat: number; lng: number } | null {
  const match = label.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function AnimalProfilePageContent() {
  const search = useSearchParams();
  const animalId = search.get('id') || '';
  const focusedSightingId = search.get('sightingId') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [animal, setAnimal] = useState<AnimalProfile | null>(null);
  const [sightings, setSightings] = useState<AnimalSightingItem[]>([]);
  const [latestLocationText, setLatestLocationText] = useState('Location unavailable');
  const [sightingLocationText, setSightingLocationText] = useState<Record<string, string>>({});
  const focusedSighting = sightings.find((item) => item.id === focusedSightingId) || null;
  const activeSighting = focusedSighting || sightings[0] || null;
  const activeLocationText = activeSighting
    ? sightingLocationText[activeSighting.id] || activeSighting.locationLabel
    : latestLocationText;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!animalId) {
        setError('Animal id is missing.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const [animalDoc, sightingRows] = await Promise.all([
          getAnimalById(animalId),
          listAnimalSightings(animalId),
        ]);

        if (!animalDoc) {
          if (!cancelled) setError('Animal not found.');
          return;
        }

        if (!cancelled) {
          setAnimal(animalDoc);
          setSightings(sightingRows);
        }
      } catch (err) {
        const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : '';
        if (!cancelled) setError(code ? `Failed to load profile (${code}).` : 'Failed to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [animalId]);

  useEffect(() => {
    const firstLabel = sightings[0]?.locationLabel || '';
    if (!firstLabel) {
      setLatestLocationText('Location unavailable');
      return;
    }

    const coords = parseLatLng(firstLabel);
    if (!coords) {
      setLatestLocationText(firstLabel);
      return;
    }
    const point = coords;

    let cancelled = false;
    async function resolveText() {
      try {
        const result = await reverseGeocode(point);
        if (!cancelled) {
          setLatestLocationText(result.label || firstLabel);
        }
      } catch {
        if (!cancelled) {
          setLatestLocationText(firstLabel);
        }
      }
    }
    resolveText();

    return () => {
      cancelled = true;
    };
  }, [sightings]);

  useEffect(() => {
    if (!sightings.length) {
      setSightingLocationText({});
      return;
    }

    let cancelled = false;
    async function resolveSightingLocations() {
      const entries = await Promise.all(
        sightings.map(async (item) => {
          const coords = parseLatLng(item.locationLabel);
          if (!coords) return [item.id, item.locationLabel] as const;
          try {
            const result = await reverseGeocode(coords);
            return [item.id, result.label || item.locationLabel] as const;
          } catch {
            return [item.id, item.locationLabel] as const;
          }
        })
      );

      if (!cancelled) {
        setSightingLocationText(Object.fromEntries(entries));
      }
    }

    resolveSightingLocations();
    return () => {
      cancelled = true;
    };
  }, [sightings]);

  return (
    <PublicAccessGuard>
      {loading ? <LoadingState text="Loading animal profile..." /> : null}
      {!loading && error ? <ErrorState text={error} /> : null}
      {!loading && !error && !animal ? <ErrorState text="Animal not found." /> : null}

      {!loading && !error && animal ? (
        <section className="mx-auto max-w-4xl space-y-5">
          <h1 className="page-title">Animal Profile</h1>

          <article className="card overflow-hidden">
            {activeSighting?.photoUrl || animal.coverPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeSighting?.photoUrl || animal.coverPhotoUrl} alt={`${animal.type} cover`} className="h-72 w-full object-cover" />
            ) : null}
            <div className="space-y-4 p-5 text-sm">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-brand-500/40 bg-[linear-gradient(145deg,rgba(106,73,37,0.86),rgba(139,96,50,0.84))] p-4 text-honey-50 shadow-[0_12px_28px_rgba(56,36,17,0.25)]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-honey-100/95">Location Information</p>
                  <p className="mt-1 text-sm font-semibold text-honey-50">
                    {focusedSighting ? 'Viewing Sighting Location' : 'Latest Location'}
                  </p>
                  <p className="text-sm leading-relaxed text-honey-50">{activeLocationText}</p>
                  {focusedSighting ? (
                    <p className="mt-1 text-xs text-honey-100/95">Current: Previous sighting</p>
                  ) : (
                    <p className="mt-1 text-xs text-honey-100/95">Current: Latest location</p>
                  )}
                </div>
                <div className="rounded-2xl border border-brand-500/40 bg-[linear-gradient(145deg,rgba(106,73,37,0.86),rgba(139,96,50,0.84))] p-4 text-honey-50 shadow-[0_12px_28px_rgba(56,36,17,0.25)]">
                  <p className="text-xs font-semibold uppercase tracking-wide text-honey-100/95">Info</p>
                  <div className="mt-1 space-y-1 text-sm leading-relaxed">
                    <p className="capitalize">Type: {animal.type}</p>
                    <p><span className="font-semibold text-honey-100">Last seen:</span> {animal.lastSeenAtLabel}</p>
                    <p><span className="font-semibold text-honey-100">Total sightings:</span> {animal.sightingCount}</p>
                  </div>
                </div>
              </div>
              {animal.aiRisk ? (
                <div className="rounded-2xl border border-brand-300 bg-brand-100/55 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">AI welfare risk screening</p>
                    <span className="rounded-full border border-brand-400/70 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
                      Urgency: {animal.aiRisk.urgency}
                    </span>
                  </div>
                  {animal.aiRisk.reason ? (
                    <div className="mt-3 space-y-1 rounded-xl border border-brand-200/80 bg-white/75 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">AI Notes</p>
                      {splitIntoSentences(animal.aiRisk.reason).map((line, idx) => (
                        <p key={`${line}-${idx}`} className="text-sm text-brand-900">
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-brand-200/80 bg-white/75 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">AI Accuracy Level</p>
                      <p className="text-lg font-semibold text-brand-900">{Math.round((animal.aiRisk.confidence || 0) * 100)}%</p>
                    </div>
                    <div className="rounded-xl border border-brand-200/80 bg-white/75 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Visible indicators</p>
                      <p className="text-sm text-brand-900">{animal.aiRisk.visibleIndicators.join(', ') || 'none'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-brand-800/70">AI welfare screening not available yet.</p>
              )}
            </div>
          </article>

          <section className="space-y-3">
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-brand-900">All Sightings</h2>
            {sightings.length === 0 ? <EmptyState text="No sightings found for this animal." /> : null}
            <div className="grid gap-3">
              {sightings.map((item, index) => {
                const isLatest = index === 0;
                const isFocused = focusedSightingId === item.id;
                return (
                  <article
                    key={item.id}
                    className={`card border p-3 ${isFocused ? 'border-brand-600 shadow-[0_0_0_2px_rgba(90,58,30,0.2)]' : 'border-brand-300/70'}`}
                  >
                    <Link
                      href={`/animal?id=${encodeURIComponent(animalId)}&sightingId=${encodeURIComponent(item.id)}`}
                      aria-label={`Open sighting ${item.id}`}
                      className="block"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${isLatest ? 'bg-brand-700 text-honey-50' : 'bg-brand-100 text-brand-800'}`}>
                          {isLatest ? 'Latest Sighting' : 'Previous sighting'}
                        </span>
                        {isFocused ? (
                          <span className="rounded-full border border-brand-300 bg-white/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
                            Current
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start">
                        {item.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.photoUrl} alt="Sighting" className="h-28 w-full rounded-xl object-cover sm:w-28" />
                        ) : null}
                        <div className="space-y-2 text-sm">
                          <p className="text-brand-900">{item.caption || 'No caption provided.'}</p>
                          <div className="rounded-lg border border-brand-200/80 bg-white/70 p-2">
                            <p className="text-xs text-brand-800/70">{item.createdAtLabel}</p>
                            <p className="text-xs text-muted">Location: {sightingLocationText[item.id] || item.locationLabel}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      ) : null}
    </PublicAccessGuard>
  );
}

export default function AnimalProfilePage() {
  return (
    <Suspense
      fallback={
        <PublicAccessGuard>
          <LoadingState text="Loading animal profile..." />
        </PublicAccessGuard>
      }
    >
      <AnimalProfilePageContent />
    </Suspense>
  );
}
