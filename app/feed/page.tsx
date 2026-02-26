"use client";

import React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { ErrorState, LoadingState } from '@/components/States';
import { observeAuth } from '@/lib/auth';
import { addCommentToAnimalFeed, getAnimalById, listFeedSightings, toggleLikeInAnimalFeed } from '@/lib/data';
import { AnimalProfile, FeedSighting } from '@/lib/types';

function splitIntoSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function FeedPhotoCarousel({ item }: { item: FeedSighting }) {
  const photos = useMemo(
    () => ((item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : [item.photoUrl]).filter(Boolean).slice(0, 3)),
    [item.photoUrl, item.photoUrls]
  );
  const [index, setIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const canSlide = photos.length > 1;

  function moveNext() {
    setIndex((prev) => (prev + 1) % photos.length);
  }

  function movePrev() {
    setIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  }

  function onTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) moveNext();
    if (delta > 0) movePrev();
    setTouchStartX(null);
  }

  return (
    <div className="relative" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photos[index]} alt={`${item.type} sighting ${index + 1}`} className="h-80 w-full rounded-2xl object-cover" />
      {canSlide ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
            onClick={movePrev}
          >
            {'<'}
          </button>
          <button
            type="button"
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white"
            onClick={moveNext}
          >
            {'>'}
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-2 py-1">
            {photos.map((_, dotIndex) => (
              <span
                key={`${item.id}-dot-${dotIndex}`}
                className={dotIndex === index ? 'h-2 w-2 rounded-full bg-white' : 'h-2 w-2 rounded-full bg-white/45'}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewerUid, setViewerUid] = useState('');
  const [viewerEmail, setViewerEmail] = useState('');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [activeAiScan, setActiveAiScan] = useState<FeedSighting | null>(null);
  const [activeAiScanProfile, setActiveAiScanProfile] = useState<AnimalProfile | null>(null);
  const [aiScanLoading, setAiScanLoading] = useState(false);
  const [aiScanError, setAiScanError] = useState('');

  useEffect(() => {
    const unsub = observeAuth((user) => {
      setViewerUid(user?.uid ?? '');
      setViewerEmail(user?.email ?? '');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const rows = await listFeedSightings(viewerUid);
        if (!cancelled) setItems(rows);
      } catch {
        if (!cancelled) setError('Unable to load feed right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [viewerUid]);

  async function onLike(item: FeedSighting) {
    if (!viewerUid) return;
    await toggleLikeInAnimalFeed(item.animalId, viewerUid, !!item.likedByMe);
    setItems((prev) =>
      prev.map((row) =>
        row.id === item.id
          ? {
              ...row,
              likedByMe: !row.likedByMe,
              likeCount: (row.likeCount ?? 0) + (row.likedByMe ? -1 : 1),
            }
          : row
      )
    );
  }

  async function onPostComment(item: FeedSighting) {
    if (!viewerUid) return;
    const draft = (commentDrafts[item.id] ?? '').trim();
    if (!draft) return;
    await addCommentToAnimalFeed(item.animalId, viewerUid, viewerEmail, draft);
    setCommentDrafts((prev) => ({ ...prev, [item.id]: '' }));
    const rows = await listFeedSightings(viewerUid);
    setItems(rows);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAiScan() {
      if (!activeAiScan) {
        setActiveAiScanProfile(null);
        setAiScanError('');
        setAiScanLoading(false);
        return;
      }

      setAiScanLoading(true);
      setAiScanError('');
      try {
        const animal = await getAnimalById(activeAiScan.animalId);
        if (!cancelled) {
          setActiveAiScanProfile(animal);
          if (!animal) setAiScanError('Animal profile not found.');
        }
      } catch {
        if (!cancelled) {
          setAiScanError('Failed to load AI health scan.');
        }
      } finally {
        if (!cancelled) setAiScanLoading(false);
      }
    }

    loadAiScan();
    return () => {
      cancelled = true;
    };
  }, [activeAiScan]);

  return (
    <PublicAccessGuard>
      <div className="page-pet-bg-fixed" aria-hidden />
      <section className="relative z-10 mx-auto max-w-6xl space-y-4">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <h1 className="page-title">Stray Feed</h1>
          {loading ? <LoadingState text="Loading feed..." /> : null}
          {!loading && error ? <ErrorState text={error} /> : null}

          {!loading && !error && items.length === 0 ? (
            <div className="card p-4 text-sm text-muted">No sightings yet.</div>
          ) : null}

          {!loading && !error
            ? items.map((item, index) => (
                <React.Fragment key={item.id}>
                  <article className="card overflow-hidden">
                    <div className="space-y-4 p-5 text-sm sm:p-6">
                      <div className="flex items-center gap-3">
                        {item.reporterPhotoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.reporterPhotoURL} alt={`${item.reporterUsername || item.reporterEmail} avatar`} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-200 text-sm font-bold text-brand-900">
                            {(item.reporterUsername || item.reporterEmail || '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            className="truncate font-semibold text-brand-900 hover:underline"
                            href={`/profile?uid=${encodeURIComponent(item.reporterUid)}`}
                          >
                            {item.reporterUsername || item.reporterEmail}
                          </Link>
                        </div>
                        <p className="text-xs text-brand-800/70">{item.createdAtLabel}</p>
                      </div>

                      <FeedPhotoCarousel item={item} />

                      <div className="rounded-2xl border border-brand-200/70 bg-brand-100/45 px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="btn-ghost px-3 py-1 text-xs"
                              aria-label="Like post"
                              disabled={!viewerUid}
                              onClick={() => onLike(item)}
                            >
                              {'\u2764\ufe0f'} {item.likeCount ?? 0}
                            </button>
                            <button
                              type="button"
                              className="btn-ghost px-3 py-1 text-xs"
                              aria-label="Toggle comments"
                              onClick={() => setExpandedComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                            >
                              {'\ud83d\udcac'} {item.commentCount ?? 0}
                            </button>
                          </div>
                          {item.aiRiskUrgency ? (
                            <p className="text-xs text-muted">
                              Urgency Level: <span className="font-semibold capitalize text-brand-900">{item.aiRiskUrgency}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <p className="text-base leading-relaxed text-brand-900">{item.caption || 'No caption provided.'}</p>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <button type="button" className="btn-ghost w-full justify-center px-3 py-2 text-xs" onClick={() => setActiveAiScan(item)}>
                      See AI health scan
                    </button>
                    <Link className="btn-secondary w-full justify-center text-center" href={`/animal?id=${item.animalId}`}>
                      Open animal profile
                    </Link>
                    <Link className="btn-ghost w-full justify-center text-center" href={`/map?animalId=${item.animalId}`}>
                      View on map
                    </Link>
                  </div>

                      {expandedComments[item.id] ? (
                        <div className="space-y-2 border-t border-brand-200/70 pt-3">
                          {item.comments && item.comments.length > 0 ? (
                            <div className="space-y-1 text-xs text-muted">
                              {item.comments.map((comment) => (
                                <p key={comment.id}>
                                  <span className="font-semibold text-brand-900">{comment.authorEmail}</span>: {comment.content}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted">No comments yet.</p>
                          )}

                          {viewerUid ? (
                            <>
                              <input
                                className="input"
                                placeholder="Add a comment"
                                value={commentDrafts[item.id] ?? ''}
                                onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                              />
                              <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => onPostComment(item)}>
                                Post comment
                              </button>
                            </>
                          ) : (
                            <p className="text-xs text-muted">Sign in to comment.</p>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </article>
                  {index === 1 ? (
                    <article className="card-elevated space-y-3 border border-honey-300">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Lost & Found</p>
                        <span className="rounded-full border border-brand-300/80 bg-honey-100/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                          Promotion
                        </span>
                      </div>
                      <h2 className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">
                        Did you lose your pet?
                      </h2>
                      <p className="text-sm text-brand-900">
                        Post your pet photos and contact details so the community can help bring them home.
                      </p>
                      <Link className="btn-primary w-full justify-center text-center" href="/lost-found">
                        Open Lost & Found
                      </Link>
                    </article>
                  ) : null}
                </React.Fragment>
              ))
            : null}
        </div>
      </section>

      {activeAiScan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/45 p-4">
          <div className="card-elevated w-full max-w-md">
            <h2 className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">AI Health Scan</h2>
            {aiScanLoading ? <p className="mt-3 text-sm text-muted">Loading AI health scan...</p> : null}
            {!aiScanLoading && aiScanError ? <p className="mt-3 text-sm text-muted">{aiScanError}</p> : null}
            {!aiScanLoading && !aiScanError && activeAiScanProfile?.aiRisk ? (
              <div className="mt-3 rounded-2xl border border-brand-300 bg-brand-100/55 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-brand-900">AI welfare risk screening</p>
                  <span className="rounded-full border border-brand-400/70 bg-white/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-800">
                    Urgency: {activeAiScanProfile.aiRisk.urgency}
                  </span>
                </div>
                {activeAiScanProfile.aiRisk.reason ? (
                  <div className="mt-3 space-y-1 rounded-xl border border-brand-200/80 bg-white/75 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">AI Notes</p>
                    {splitIntoSentences(activeAiScanProfile.aiRisk.reason).map((line, idx) => (
                      <p key={`${line}-${idx}`} className="text-sm text-brand-900">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-brand-200/80 bg-white/75 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">AI Accuracy Level</p>
                    <p className="text-lg font-semibold text-brand-900">{Math.round((activeAiScanProfile.aiRisk.confidence || 0) * 100)}%</p>
                  </div>
                  <div className="rounded-xl border border-brand-200/80 bg-white/75 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Visible indicators</p>
                    <p className="text-sm text-brand-900">{activeAiScanProfile.aiRisk.visibleIndicators.join(', ') || 'none'}</p>
                  </div>
                </div>
              </div>
            ) : (
              !aiScanLoading && !aiScanError ? <p className="mt-3 text-sm text-muted">AI welfare screening not available yet.</p> : null
            )}
            <div className="mt-5 flex gap-2">
              <button className="btn-secondary" type="button" onClick={() => setActiveAiScan(null)}>
                Close
              </button>
              <Link className="btn-primary" href={`/animal?id=${activeAiScan.animalId}`}>
                Open full profile
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </PublicAccessGuard>
  );
}
