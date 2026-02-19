import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { CaseDoc, CaseEvent, CaseFilters } from './types';

export function getSessionId() {
  const key = 'straylink_session_id';
  const existing = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  if (existing) return existing;
  const generated = crypto.randomUUID();
  if (typeof window !== 'undefined') window.localStorage.setItem(key, generated);
  return generated;
}

export function createTrackingToken() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export function buildTrackId(caseId: string, token: string) {
  return `${caseId}_${token}`;
}

export async function createCaseId() {
  return doc(collection(db, 'cases')).id;
}

export async function uploadCaseImage(caseId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `cases/${caseId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

export async function setCase(caseId: string, payload: CaseDoc) {
  await setDoc(doc(db, 'cases', caseId), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function setPublicTrackSnapshot(trackId: string, payload: Record<string, unknown>) {
  await setDoc(doc(db, 'public_tracks', trackId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePublicTrackSnapshot(trackId: string, changes: Record<string, unknown>) {
  await updateDoc(doc(db, 'public_tracks', trackId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function getPublicTrack(caseId: string, token: string) {
  const trackId = buildTrackId(caseId, token);
  const snap = await getDoc(doc(db, 'public_tracks', trackId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function logCaseEvent(event: CaseEvent) {
  await addDoc(collection(db, 'case_events'), {
    ...event,
    timestamp: serverTimestamp(),
  });
}

export async function getCaseById(caseId: string) {
  const snap = await getDoc(doc(db, 'cases', caseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function listCases(filters: CaseFilters = {}) {
  let q = query(collection(db, 'cases'), orderBy('createdAt', 'desc'), limit(200));

  if (filters.status && filters.status !== 'all') {
    q = query(collection(db, 'cases'), where('status', '==', filters.status), orderBy('createdAt', 'desc'), limit(200));
  }

  const snaps = await getDocs(q);
  let rows = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (filters.urgency && filters.urgency !== 'all') {
    rows = rows.filter((row) => row.triage?.urgency === filters.urgency);
  }

  if (filters.animalType && filters.animalType !== 'all') {
    rows = rows.filter((row) => row.ai?.animalType === filters.animalType);
  }

  return rows;
}

export async function updateCase(caseId: string, changes: Record<string, unknown>) {
  await updateDoc(doc(db, 'cases', caseId), changes);
}
