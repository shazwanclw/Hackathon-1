"use client";

import React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { observeAuth } from '@/lib/auth';
import { followUser, getUserProfileSummary, isFollowingUser, listUserFeedSightings, saveUserProfile, unfollowUser, uploadUserProfilePhoto, upsertUserProfile } from '@/lib/data';
import { FeedSighting, UserProfileSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

function ProfilePageContent() {
  const search = useSearchParams();
  const queryUid = useMemo(() => (search.get('uid') || '').trim(), [search]);
  const [authUid, setAuthUid] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileSummary | null>(null);
  const [reports, setReports] = useState<FeedSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = observeAuth((user) => {
      setAuthUid(user?.uid ?? '');
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    const uid = queryUid || authUid;
    if (!uid) {
      setLoading(false);
      setError('User profile is unavailable.');
      return;
    }

    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        if (authUid) {
          await upsertUserProfile(authUid, '');
        }
        const [summary, rows] = await Promise.all([getUserProfileSummary(uid), listUserFeedSightings(uid)]);
        const following = authUid && authUid !== uid ? await isFollowingUser(authUid, uid) : false;
        if (!cancelled) {
          setProfile(summary);
          setUsernameDraft(summary.username);
          setReports(rows);
          setIsFollowing(following);
        }
      } catch {
        if (!cancelled) setError('Failed to load profile right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, authUid, queryUid]);

  const viewedUid = queryUid || authUid;
  const isOwnProfile = !!authUid && authUid === viewedUid;

  async function onSaveUsername() {
    if (!authUid || !isOwnProfile || !profile) return;
    setSavingProfile(true);
    try {
      await saveUserProfile(authUid, {
        email: profile.email,
        username: usernameDraft.trim() || profile.username,
        photoURL: profile.photoURL,
      });
      const refreshed = await getUserProfileSummary(authUid);
      setProfile(refreshed);
      setUsernameDraft(refreshed.username);
      setEditingUsername(false);
    } finally {
      setSavingProfile(false);
    }
  }

  async function onPhotoPicked(file: File | null) {
    if (!file || !authUid || !isOwnProfile || !profile) return;
    setSavingProfile(true);
    try {
      const uploaded = await uploadUserProfilePhoto(authUid, file);
      await saveUserProfile(authUid, {
        email: profile.email,
        username: usernameDraft.trim() || profile.username,
        photoURL: uploaded.downloadUrl,
      });
      const refreshed = await getUserProfileSummary(authUid);
      setProfile(refreshed);
      setUsernameDraft(refreshed.username);
    } finally {
      setSavingProfile(false);
    }
  }

  async function onFollowToggle() {
    if (!profile || !viewedUid || !authUid || authUid === viewedUid) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(authUid, viewedUid);
      } else {
        await followUser(authUid, viewedUid);
      }
      const refreshed = await getUserProfileSummary(viewedUid);
      setProfile(refreshed);
      setIsFollowing((prev) => !prev);
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-3xl space-y-4">
        <h1 className="page-title">User Profile</h1>

        {loading ? <LoadingState text="Loading profile..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}

        {!loading && !error && profile ? (
          <article className="card p-5 text-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {profile.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.photoURL} alt={`${profile.username} avatar`} className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-200 text-xl font-bold text-brand-900">
                      {profile.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  {isOwnProfile ? (
                    <>
                      <button
                        type="button"
                        aria-label="Edit profile photo"
                        className="absolute -bottom-1 -right-1 rounded-full border border-brand-300 bg-honey-200 px-2 py-1 text-[10px] text-brand-900"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={savingProfile}
                      >
                        ✎
                      </button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(event) => onPhotoPicked(event.target.files?.[0] ?? null)}
                      />
                    </>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {editingUsername && isOwnProfile ? (
                      <input
                        className="input h-9 py-1"
                        aria-label="Edit username"
                        value={usernameDraft}
                        onChange={(event) => setUsernameDraft(event.target.value)}
                      />
                    ) : (
                      <p className="truncate text-xl font-semibold text-brand-900">{profile.username}</p>
                    )}
                    {isOwnProfile ? (
                      <button
                        type="button"
                        aria-label="Edit username"
                        className="rounded-full border border-brand-300 bg-honey-200 px-2 py-1 text-[10px] text-brand-900"
                        onClick={() => setEditingUsername((prev) => !prev)}
                        disabled={savingProfile}
                      >
                        ✎
                      </button>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted">{profile.email}</p>
                  {editingUsername && isOwnProfile ? (
                    <div className="mt-2 flex gap-2">
                      <button className="btn-secondary px-3 py-1 text-xs" type="button" onClick={onSaveUsername} disabled={savingProfile}>
                        {savingProfile ? 'Saving...' : 'Save username'}
                      </button>
                      <button
                        className="btn-ghost px-3 py-1 text-xs"
                        type="button"
                        onClick={() => {
                          setUsernameDraft(profile.username);
                          setEditingUsername(false);
                        }}
                        disabled={savingProfile}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
              {!isOwnProfile ? (
                <button className="btn-primary" type="button" onClick={onFollowToggle} disabled={followLoading || !authUid}>
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
              <p>Followers: {profile.followersCount}</p>
              <p>Following: {profile.followingCount}</p>
              <p>Posts: {profile.reportCount}</p>
            </div>
          </article>
        ) : null}

        {!loading && !error ? (
          <section className="space-y-3">
            <h2 className="font-[var(--font-display)] text-2xl font-semibold text-brand-900">Posts</h2>
            {reports.length === 0 ? <EmptyState text="No posts found for this user." /> : null}
            {reports.map((item) => (
              <article key={item.id} className="card overflow-hidden">
                {(item.photoUrls && item.photoUrls.length > 0) || item.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : [item.photoUrl])[0]}
                    alt={`${item.type} sighting`}
                    className="h-80 w-full object-cover"
                  />
                ) : null}
                <div className="space-y-2 p-4 text-sm">
                  <p className="font-semibold capitalize text-brand-900">{item.type}</p>
                  <p className="text-brand-900">{item.caption || 'No caption provided.'}</p>
                  <p className="text-xs text-brand-800/70">{item.createdAtLabel}</p>
                  <div className="flex gap-4 text-sm">
                    <Link className="link-inline" href={`/animal?id=${item.animalId}`}>
                      Open animal profile
                    </Link>
                    <Link className="link-inline" href={`/map?animalId=${item.animalId}`}>
                      View on map
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        ) : null}
      </section>
    </PublicAccessGuard>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <PublicAccessGuard>
          <LoadingState text="Loading profile..." />
        </PublicAccessGuard>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
