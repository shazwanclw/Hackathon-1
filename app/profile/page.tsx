"use client";

import React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PublicAccessGuard from '@/components/PublicAccessGuard';
import { EmptyState, ErrorState, LoadingState } from '@/components/States';
import { observeAuth } from '@/lib/auth';
import { deleteAnimalPost, followUser, getUserProfileSummary, isFollowingUser, listUserFeedSightings, saveUserProfile, unfollowUser, uploadUserProfilePhoto, upsertUserProfile } from '@/lib/data';
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
  const [deletingAnimalId, setDeletingAnimalId] = useState('');
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

  async function onDeletePost(animalId: string) {
    if (!isOwnProfile || !animalId) return;
    if (!window.confirm('Delete this post?')) return;

    setDeletingAnimalId(animalId);
    try {
      await deleteAnimalPost(animalId);
      setReports((current) => current.filter((item) => item.animalId !== animalId));
      setProfile((current) => {
        if (!current) return current;
        return {
          ...current,
          reportCount: Math.max(0, current.reportCount - 1),
        };
      });
      toast.success('Post deleted.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete post. Please refresh and try again.');
    } finally {
      setDeletingAnimalId('');
    }
  }

  return (
    <PublicAccessGuard>
      <section className="mx-auto max-w-6xl space-y-6">
        <h1 className="page-title">User Profile</h1>

        {loading ? <LoadingState text="Loading profile..." /> : null}
        {!loading && error ? <ErrorState text={error} /> : null}

        {!loading && !error && profile ? (
          <article className="card-elevated p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-center">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="relative shrink-0">
                  {profile.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.photoURL} alt={`${profile.username} avatar`} className="h-24 w-24 rounded-full border-2 border-honey-200/70 object-cover shadow-[0_10px_20px_rgba(62,40,20,0.25)] sm:h-28 sm:w-28" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-honey-200/70 bg-brand-200 text-3xl font-bold text-brand-900 shadow-[0_10px_20px_rgba(62,40,20,0.25)] sm:h-28 sm:w-28">
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
                        Edit
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
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {editingUsername && isOwnProfile ? (
                      <input
                        className="input h-10 max-w-xs py-2"
                        aria-label="Edit username"
                        value={usernameDraft}
                        onChange={(event) => setUsernameDraft(event.target.value)}
                      />
                    ) : (
                      <p className="truncate font-[var(--font-display)] text-4xl font-semibold text-brand-900 sm:text-5xl">{profile.username}</p>
                    )}
                    {isOwnProfile ? (
                      <button
                        type="button"
                        aria-label="Edit username"
                        className="btn-ghost px-3 py-1 text-xs"
                        onClick={() => setEditingUsername((prev) => !prev)}
                        disabled={savingProfile}
                      >
                        Edit name
                      </button>
                    ) : null}
                  </div>
                  <p className="text-base text-muted">{profile.email}</p>

                  {editingUsername && isOwnProfile ? (
                    <div className="flex gap-2">
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

              <div className="mx-auto grid w-full max-w-[24rem] grid-cols-3 place-self-center gap-2 self-center items-start auto-rows-min sm:gap-3">
                <div className="h-fit rounded-xl border border-brand-300/80 bg-white/75 px-2.5 py-1 text-center">
                  <p className="font-[var(--font-display)] text-xl font-semibold leading-none text-brand-900 sm:text-2xl">{profile.followersCount}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-brand-700">Followers</p>
                </div>
                <div className="h-fit rounded-xl border border-brand-300/80 bg-white/75 px-2.5 py-1 text-center">
                  <p className="font-[var(--font-display)] text-xl font-semibold leading-none text-brand-900 sm:text-2xl">{profile.followingCount}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-brand-700">Following</p>
                </div>
                <div className="h-fit rounded-xl border border-brand-300/80 bg-white/75 px-2.5 py-1 text-center">
                  <p className="font-[var(--font-display)] text-xl font-semibold leading-none text-brand-900 sm:text-2xl">{profile.reportCount}</p>
                  <p className="mt-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-brand-700">Posts</p>
                </div>
              </div>

              {!isOwnProfile ? (
                <div className="flex justify-start lg:justify-end">
                  <button className="btn-primary min-w-32" type="button" onClick={onFollowToggle} disabled={followLoading || !authUid}>
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        ) : null}

        {!loading && !error ? (
          <section className="space-y-3">
            <h2 className="font-[var(--font-display)] text-4xl font-semibold text-brand-900">Posts</h2>
            {reports.length === 0 ? <EmptyState text="No posts found for this user." /> : null}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {reports.map((item) => (
                <article key={item.id} className="card overflow-hidden">
                  {(item.photoUrls && item.photoUrls.length > 0) || item.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : [item.photoUrl])[0]}
                      alt={`${item.type} sighting`}
                      className="h-64 w-full object-cover"
                    />
                  ) : null}
                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="rounded-full border border-brand-300/70 bg-brand-100/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-800">
                        {item.type}
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-brand-800/70">{item.createdAtLabel}</p>
                        {isOwnProfile ? (
                          <button
                            type="button"
                            aria-label="Delete post"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand-300/80 bg-white/80 text-brand-800 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
                            onClick={() => onDeletePost(item.animalId)}
                            disabled={deletingAnimalId === item.animalId}
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="min-h-16 text-sm leading-relaxed text-brand-900">{item.caption || 'No caption provided.'}</p>
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn-secondary justify-center px-3 py-1.5 text-xs text-center" href={`/animal?id=${item.animalId}`}>
                        Open animal profile
                      </Link>
                      <Link className="btn-ghost justify-center px-3 py-1.5 text-xs text-center" href={`/map?animalId=${item.animalId}`}>
                        View on map
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
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
