"use client";

import React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { ErrorState, LoadingState } from '@/components/States';
import { observeAuth } from '@/lib/auth';
import { addCommentToAnimalFeed, listFeedSightings, toggleLikeInAnimalFeed } from '@/lib/data';
import { FeedSighting } from '@/lib/types';

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

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-2xl space-y-4">
        <h1 className="page-title">Stray Feed</h1>
        <p className="page-subtitle">Latest community sightings, newest first.</p>

        {loading ? <LoadingState text="Loading feed..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}

        {!loading && !error && items.length === 0 ? (
          <div className="card p-4 text-sm text-muted">No sightings yet.</div>
        ) : null}

        {!loading && !error
          ? items.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                <div className="space-y-3 p-4 text-sm">
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
                      <p className="truncate font-semibold text-brand-900">{item.reporterUsername || item.reporterEmail}</p>
                      <p className="truncate text-xs text-muted">{item.reporterEmail}</p>
                    </div>
                    <p className="text-xs text-brand-800/70">{item.createdAtLabel}</p>
                  </div>

                  <FeedPhotoCarousel item={item} />

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1 text-xs"
                      disabled={!viewerUid}
                      onClick={() => onLike(item)}
                    >
                      {item.likedByMe ? 'Unlike' : 'Like'} ({item.likeCount ?? 0})
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1 text-xs"
                      onClick={() => setExpandedComments((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    >
                      Comment ({item.commentCount ?? 0})
                    </button>
                  </div>

                  {item.comments && item.comments.length > 0 ? (
                    <div className="space-y-1 text-xs text-muted">
                      {item.comments.map((comment) => (
                        <p key={comment.id}>
                          <span className="font-semibold text-brand-900">{comment.authorEmail}</span>: {comment.content}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {expandedComments[item.id] ? (
                    <div className="space-y-2">
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

                  <p className="text-brand-900">{item.caption || 'No caption provided.'}</p>

                  {item.aiRiskUrgency ? (
                    <p className="text-xs text-muted">
                      Urgency Level: <span className="font-semibold capitalize text-brand-900">{item.aiRiskUrgency}</span>
                    </p>
                  ) : null}

                  <Link className="btn-ghost px-3 py-1 text-xs" href={`/animal?id=${item.animalId}`}>
                    See AI health scan
                  </Link>

                  <div className="flex gap-3 text-sm">
                    <Link className="btn-secondary" href={`/animal?id=${item.animalId}`}>
                      Open animal profile
                    </Link>
                    <Link className="btn-ghost" href={`/map?animalId=${item.animalId}`}>
                      View on map
                    </Link>
                  </div>
                </div>
              </article>
            ))
          : null}
      </section>
    </PublicAccessGuard>
  );
}
