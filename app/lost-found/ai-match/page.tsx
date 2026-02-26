"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { User } from 'firebase/auth';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import UploadDropzone from '@/components/UploadDropzone';
import { observeAuth } from '@/lib/auth';
import { listLostFoundMatchHistory, saveLostFoundMatchHistory } from '@/lib/data';
import { findLostPetMatches, LostPetMatchResult } from '@/lib/lostFoundAi';
import { LostFoundMatchHistoryItem } from '@/lib/types';

export default function LostFoundAiMatchPage() {
  const [user, setUser] = useState<User | null>(null);
  const [matchFiles, setMatchFiles] = useState<File[]>([]);
  const [matchFileError, setMatchFileError] = useState('');
  const [matchAnimalType, setMatchAnimalType] = useState<'any' | 'cat' | 'dog'>('any');
  const [matchLoading, setMatchLoading] = useState(false);
  const [matches, setMatches] = useState<LostPetMatchResult[]>([]);
  const [historyItems, setHistoryItems] = useState<LostFoundMatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySaving, setHistorySaving] = useState(false);

  useEffect(() => {
    const unsub = observeAuth((next) => {
      setUser(next);
    });
    return () => unsub();
  }, []);

  function onMatchFilesChange(next: File[]) {
    if (!next.length) {
      setMatchFiles([]);
      setMatchFileError('');
      return;
    }

    const file = next[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setMatchFiles([]);
      setMatchFileError('File exceeds 3MB. Please upload a smaller image.');
      return;
    }

    setMatchFiles([file]);
    setMatchFileError('');
  }

  async function onFindMatches() {
    const file = matchFiles[0];
    if (!file) {
      toast.error('Please upload a pet photo for matching.');
      return;
    }

    setMatchLoading(true);
    setMatches([]);
    try {
      const rows = await findLostPetMatches({ file, animalType: matchAnimalType });
      setMatches(rows);
      if (!rows.length) toast('No clear matches found yet. Try another image angle.');
    } catch {
      toast.error('AI matching failed. Please try again.');
    } finally {
      setMatchLoading(false);
    }
  }

  async function loadHistory(uid: string) {
    setHistoryLoading(true);
    try {
      const rows = await listLostFoundMatchHistory(uid);
      setHistoryItems(rows);
    } catch {
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (!user?.uid) {
      setHistoryItems([]);
      return;
    }
    loadHistory(user.uid);
  }, [user?.uid]);

  async function onSaveMatchHistory() {
    if (!user?.uid) {
      toast.error('Please sign in to save match history.');
      return;
    }
    if (!matches.length) {
      toast.error('No match results to save yet.');
      return;
    }

    setHistorySaving(true);
    try {
      await saveLostFoundMatchHistory({
        createdBy: user.uid,
        animalType: matchAnimalType,
        matches: matches.map((match) => ({
          animalId: match.animalId,
          score: match.score,
          reason: match.reason,
          type: match.type,
          coverPhotoUrl: match.coverPhotoUrl,
          lastSeenLocation: match.lastSeenLocation,
        })),
      });
      toast.success('Match results saved.');
      await loadHistory(user.uid);
    } catch {
      toast.error('Failed to save match history.');
    } finally {
      setHistorySaving(false);
    }
  }

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-6xl space-y-6 pb-16">
        <div className="card-elevated p-6 sm:p-8">
          <p className="pill">Phase 1 prototype</p>
          <h1 className="page-title mt-3">AI Lost & Found Match</h1>
          <p className="page-subtitle mt-2">Upload one photo to retrieve top likely matches from recent stray posts.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="card-elevated space-y-4 p-6">
              <UploadDropzone files={matchFiles} onFilesChange={onMatchFilesChange} error={matchFileError} />

              <div className="flex gap-2">
                <button
                  type="button"
                  className={matchAnimalType === 'any' ? 'segment-active' : 'segment'}
                  onClick={() => setMatchAnimalType('any')}
                >
                  Any
                </button>
                <button
                  type="button"
                  className={matchAnimalType === 'cat' ? 'segment-active' : 'segment'}
                  onClick={() => setMatchAnimalType('cat')}
                >
                  Cat
                </button>
                <button
                  type="button"
                  className={matchAnimalType === 'dog' ? 'segment-active' : 'segment'}
                  onClick={() => setMatchAnimalType('dog')}
                >
                  Dog
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={onFindMatches} disabled={matchLoading}>
                  {matchLoading ? 'Matching...' : 'Find Matches'}
                </button>
                <button type="button" className="btn-secondary" onClick={onSaveMatchHistory} disabled={historySaving || !matches.length}>
                  {historySaving ? 'Saving...' : 'Save Results to History'}
                </button>
                <Link className="btn-ghost" href="/lost-found">
                  Back to posts
                </Link>
              </div>

              {!matchLoading && matches.length === 0 ? <p className="text-xs text-muted">No matches yet.</p> : null}
            </div>

            <div className="space-y-3">
              {matches.map((match, index) => (
                <article key={`${match.animalId}-${index}`} className="card border border-brand-300/70 p-4">
                  <div className="flex gap-3">
                    {match.coverPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={match.coverPhotoUrl} alt={`Match ${match.animalId}`} className="h-24 w-24 rounded-xl object-cover" />
                    ) : null}
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold text-brand-900">Match #{index + 1} • {(match.score * 100).toFixed(0)}%</p>
                      <p className="text-brand-900">{match.reason || 'Potential visual similarity found.'}</p>
                      <p className="text-xs text-muted capitalize">Type: {match.type || 'other'}</p>
                      {match.lastSeenLocation ? (
                        <p className="text-xs text-muted">
                          Last seen: {match.lastSeenLocation.lat.toFixed(5)}, {match.lastSeenLocation.lng.toFixed(5)}
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <Link className="btn-secondary px-3 py-1.5 text-xs" href={`/animal?id=${match.animalId}`}>
                          Open profile
                        </Link>
                        <Link className="btn-ghost px-3 py-1.5 text-xs" href={`/map?animalId=${match.animalId}`}>
                          View on map
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="card space-y-3 p-5 lg:sticky lg:top-24 lg:self-start">
            <h2 className="font-[var(--font-display)] text-3xl font-semibold text-brand-900">Match History</h2>
            {!user ? <p className="text-xs text-muted">Sign in to view saved match history.</p> : null}
            {user && historyLoading ? <p className="text-xs text-muted">Loading history...</p> : null}
            {user && !historyLoading && historyItems.length === 0 ? <p className="text-xs text-muted">No saved history yet.</p> : null}

            {historyItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-brand-300/70 bg-white/70 p-3">
                <p className="text-xs text-muted">
                  {item.createdAtLabel} • filter: <span className="capitalize">{item.animalType}</span>
                </p>
                <div className="mt-2 space-y-2">
                  {item.matches.map((match, index) => (
                    <div key={`${item.id}-${match.animalId}-${index}`} className="flex items-center gap-2 text-sm">
                      <p className="font-semibold text-brand-900">#{index + 1}</p>
                      <p className="text-brand-900">{(match.score * 100).toFixed(0)}%</p>
                      <Link className="link-inline" href={`/animal?id=${match.animalId}`}>
                        {match.animalId}
                      </Link>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicAccessGuard>
  );
}
