import {
  addDoc,
  collection,
  doc,
  GeoPoint,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { AnimalDoc, AnimalMapMarker, AnimalProfile, AnimalSightingDoc, AnimalSightingItem, AnimalType, CaseDoc, CaseEvent, CaseFilters, FeedSighting, PublicMapCase, RiskAnimalType, Urgency, UserProfileSummary } from './types';

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

export async function createAnimalId() {
  return doc(collection(db, 'animals')).id;
}

export async function uploadSightingImage(animalId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `animals/${animalId}/sightings/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

type NewAnimalPayloadInput = {
  type: AnimalType;
  caption: string;
  photoUrl: string;
  photoPath: string;
  location: { lat: number; lng: number };
  authorUid: string;
  authorEmail: string;
};

type NewCasePayloadInput = {
  animalId: string;
  createdBy: string;
  trackingToken: string;
  photo: {
    storagePath: string;
    downloadUrl: string;
  };
  location: { lat: number; lng: number };
  note: string;
  ai: {
    animalType: AnimalType;
    confidence: number;
    rawTopLabel: string;
  };
};

type NewSightingPayloadInput = {
  animalId: string;
  type: AnimalType;
  caption: string;
  photoUrl: string;
  photoPath: string;
  location: { lat: number; lng: number };
  authorUid: string;
  authorEmail: string;
};

export function buildNewAnimalPayload(input: NewAnimalPayloadInput) {
  return {
    createdBy: input.authorUid,
    createdByEmail: input.authorEmail,
    type: input.type,
    coverPhotoUrl: input.photoUrl,
    lastSeenLocation: {
      lat: input.location.lat,
      lng: input.location.lng,
    },
    lastSeenAt: null,
    sightingCount: 1,
    latestSightingCaption: input.caption,
    latestSightingPhotoPath: input.photoPath,
  };
}

export function buildNewSightingPayload(input: NewSightingPayloadInput) {
  return {
    animalId: input.animalId,
    authorUid: input.authorUid,
    authorEmail: input.authorEmail,
    type: input.type,
    caption: input.caption,
    photoUrl: input.photoUrl,
    photoPath: input.photoPath,
    location: {
      lat: input.location.lat,
      lng: input.location.lng,
    },
    commentCount: 0,
    createdAt: null,
  };
}

export function buildAiRiskAdminOverride(
  values?: Partial<{
    overridden: boolean;
    urgency: Urgency | null;
    animalType: RiskAnimalType | null;
    note: string | null;
    overriddenBy: string | null;
    overriddenAt: unknown | null;
  }>
) {
  return {
    overridden: values?.overridden ?? false,
    urgency: values?.urgency ?? null,
    animalType: values?.animalType ?? null,
    note: values?.note ?? null,
    overriddenBy: values?.overriddenBy ?? null,
    overriddenAt: values?.overriddenAt ?? null,
  };
}

export function buildNewCasePayload(input: NewCasePayloadInput): CaseDoc {
  return {
    animalId: input.animalId,
    createdBy: input.createdBy,
    trackingToken: input.trackingToken,
    photo: {
      storagePath: input.photo.storagePath,
      downloadUrl: input.photo.downloadUrl,
    },
    location: {
      lat: input.location.lat,
      lng: input.location.lng,
      addressText: '',
      accuracy: 'exact',
    },
    report: {
      count: '1',
      behavior: 'unknown',
      immediateDanger: false,
      note: input.note,
    },
    ai: {
      model: 'tfjs-mobilenet',
      animalType: input.ai.animalType,
      confidence: input.ai.confidence,
      rawTopLabel: input.ai.rawTopLabel,
    },
    triage: {
      urgency: 'medium',
      reason: 'Pending human verification.',
      needsHumanVerification: true,
      source: 'ai',
    },
    status: 'new',
    assignedTo: null,
    resolution: null,
  };
}

export async function createAnimalWithFirstSighting(input: NewSightingPayloadInput) {
  const animalRef = doc(db, 'animals', input.animalId);
  const sightingRef = doc(collection(db, 'animals', input.animalId, 'sightings'));

  const animalPayload = buildNewAnimalPayload({
    type: input.type,
    caption: input.caption,
    photoUrl: input.photoUrl,
    photoPath: input.photoPath,
    location: input.location,
    authorUid: input.authorUid,
    authorEmail: input.authorEmail,
  });

  const sightingPayload = buildNewSightingPayload(input);

  const batch = writeBatch(db);
  batch.set(animalRef, {
    ...(animalPayload as Omit<AnimalDoc, 'createdAt' | 'lastSeenAt'>),
    createdAt: serverTimestamp(),
    lastSeenAt: serverTimestamp(),
    lastSeenLocation: new GeoPoint(input.location.lat, input.location.lng),
  });
  batch.set(sightingRef, {
    ...(sightingPayload as Omit<AnimalSightingDoc, 'createdAt' | 'location'>),
    createdAt: serverTimestamp(),
    location: new GeoPoint(input.location.lat, input.location.lng),
  });
  await batch.commit();

  return { animalId: animalRef.id, sightingId: sightingRef.id };
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

export async function setPublicMapCase(caseId: string, payload: Record<string, unknown>) {
  await setDoc(doc(db, 'public_map_cases', caseId), {
    caseId,
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePublicMapCase(caseId: string, changes: Record<string, unknown>) {
  await updateDoc(doc(db, 'public_map_cases', caseId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePublicTrackSnapshot(trackId: string, changes: Record<string, unknown>) {
  await updateDoc(doc(db, 'public_tracks', trackId), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

export async function getPublicTrack(caseId: string, token: string): Promise<any | null> {
  const trackId = buildTrackId(caseId, token);
  const snap = await getDoc(doc(db, 'public_tracks', trackId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return { id: snap.id, ...data };
}

export async function logCaseEvent(event: CaseEvent) {
  await addDoc(collection(db, 'case_events'), {
    ...event,
    timestamp: serverTimestamp(),
  });
}

export async function getCaseById(caseId: string): Promise<any | null> {
  const snap = await getDoc(doc(db, 'cases', caseId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return { id: snap.id, ...data };
}

export async function listCases(filters: CaseFilters = {}) {
  let q = query(collection(db, 'cases'), orderBy('createdAt', 'desc'), limit(200));

  if (filters.status && filters.status !== 'all') {
    q = query(collection(db, 'cases'), where('status', '==', filters.status), orderBy('createdAt', 'desc'), limit(200));
  }

  const snaps = await getDocs(q);
  let rows: any[] = snaps.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (filters.urgency && filters.urgency !== 'all') {
    rows = rows.filter((row) => row.triage?.urgency === filters.urgency);
  }

  if (filters.animalType && filters.animalType !== 'all') {
    rows = rows.filter((row) => row.ai?.animalType === filters.animalType);
  }

  return rows;
}

export async function listPublicMapCases(filters: CaseFilters = {}): Promise<PublicMapCase[]> {
  const snaps = await getDocs(query(collection(db, 'public_map_cases'), limit(500)));
  let rows = snaps.docs.map((d) => ({ id: d.id, ...d.data() })) as PublicMapCase[];

  if (filters.status && filters.status !== 'all') {
    rows = rows.filter((row) => row.status === filters.status);
  }

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

export async function listFeedSightings(): Promise<FeedSighting[]> {
  const snaps = await getDocs(query(collection(db, 'animals'), orderBy('createdAt', 'desc'), limit(100)));
  return snaps.docs.map((snap) => mapAnimalDocToFeedSighting(snap.id, snap.data() as Record<string, unknown>));
}

export async function listUserFeedSightings(uid: string): Promise<FeedSighting[]> {
  const snaps = await getDocs(query(collection(db, 'animals'), where('createdBy', '==', uid), limit(200)));
  const rows = snaps.docs.map((snap) => {
    const data = snap.data() as Record<string, unknown>;
    const mapped = mapAnimalDocToFeedSighting(snap.id, data);
    return {
      ...mapped,
      createdAtTs: extractCreatedAtTimestamp(data),
    };
  });

  rows.sort((a, b) => b.createdAtTs - a.createdAtTs);
  return rows.map(({ createdAtTs: _createdAtTs, ...row }) => row);
}

export async function getUserProfileSummary(uid: string): Promise<UserProfileSummary> {
  const snaps = await getDocs(query(collection(db, 'animals'), where('createdBy', '==', uid), limit(200)));
  const docs = snaps.docs.map((snap) => snap.data() as Record<string, unknown>);
  const firstWithEmail = docs.find((item) => typeof item.createdByEmail === 'string' && item.createdByEmail);

  return {
    uid,
    email: firstWithEmail ? String(firstWithEmail.createdByEmail) : 'Unknown reporter',
    reportCount: snaps.size,
  };
}

export async function listAnimalMapMarkers(): Promise<AnimalMapMarker[]> {
  const snaps = await getDocs(query(collection(db, 'animals'), limit(500)));

  return snaps.docs
    .map((snap) => {
      const data = snap.data() as Record<string, unknown>;
      const location = data.lastSeenLocation as GeoPoint | { lat?: number; lng?: number } | undefined;
      const lat =
        typeof (location as GeoPoint | undefined)?.latitude === 'number'
          ? (location as GeoPoint).latitude
          : typeof (location as { lat?: number } | undefined)?.lat === 'number'
            ? (location as { lat: number }).lat
            : null;
      const lng =
        typeof (location as GeoPoint | undefined)?.longitude === 'number'
          ? (location as GeoPoint).longitude
          : typeof (location as { lng?: number } | undefined)?.lng === 'number'
            ? (location as { lng: number }).lng
            : null;

      if (typeof lat !== 'number' || typeof lng !== 'number') return null;

      return {
        id: snap.id,
        type: (data.type as AnimalType) ?? 'other',
        coverPhotoUrl: String(data.coverPhotoUrl ?? ''),
        location: { lat, lng },
      } as AnimalMapMarker;
    })
    .filter((row): row is AnimalMapMarker => row !== null);
}

export async function getAnimalById(animalId: string): Promise<AnimalProfile | null> {
  const snap = await getDoc(doc(db, 'animals', animalId));
  if (!snap.exists()) return null;

  const data = snap.data() as Record<string, unknown>;
  const rawLastSeen = data.lastSeenAt as { toDate?: () => Date } | undefined;
  const lastSeenAt = typeof rawLastSeen?.toDate === 'function' ? rawLastSeen.toDate() : null;
  const rawAiRisk = data.aiRisk as Record<string, unknown> | undefined;
  const rawAiRiskCreatedAt = rawAiRisk?.createdAt as { toDate?: () => Date } | undefined;
  const aiRiskCreatedAt = typeof rawAiRiskCreatedAt?.toDate === 'function' ? rawAiRiskCreatedAt.toDate() : null;

  return {
    id: snap.id,
    type: (data.type as AnimalType) ?? 'other',
    coverPhotoUrl: String(data.coverPhotoUrl ?? ''),
    lastSeenAtLabel: lastSeenAt ? lastSeenAt.toLocaleString() : 'Unknown',
    sightingCount: Number(data.sightingCount ?? 0),
    aiRisk: rawAiRisk
      ? {
          animalType: String(rawAiRisk.animalType ?? 'unknown') as any,
          visibleIndicators: Array.isArray(rawAiRisk.visibleIndicators)
            ? rawAiRisk.visibleIndicators.map((v) => String(v))
            : [],
          urgency: String(rawAiRisk.urgency ?? 'low') as any,
          reason: String(rawAiRisk.reason ?? ''),
          confidence: Number(rawAiRisk.confidence ?? 0),
          disclaimer: String(rawAiRisk.disclaimer ?? ''),
          needsHumanVerification: true,
          error: rawAiRisk.error ? String(rawAiRisk.error) : null,
          model: String(rawAiRisk.model ?? ''),
          createdAtLabel: aiRiskCreatedAt ? aiRiskCreatedAt.toLocaleString() : 'Unknown',
        }
      : null,
  };
}

export async function listAnimalSightings(animalId: string): Promise<AnimalSightingItem[]> {
  const snaps = await getDocs(
    query(collection(db, 'animals', animalId, 'sightings'), orderBy('createdAt', 'desc'), limit(200))
  );

  return snaps.docs.map((snap) => {
    const data = snap.data() as Record<string, unknown>;
    const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
    const createdAt = typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
    const createdAtLabel = createdAt ? createdAt.toLocaleString() : 'Just now';

    const location = data.location as GeoPoint | { lat?: number; lng?: number } | undefined;
    const lat =
      typeof (location as GeoPoint | undefined)?.latitude === 'number'
        ? (location as GeoPoint).latitude
        : typeof (location as { lat?: number } | undefined)?.lat === 'number'
          ? (location as { lat: number }).lat
          : null;
    const lng =
      typeof (location as GeoPoint | undefined)?.longitude === 'number'
        ? (location as GeoPoint).longitude
        : typeof (location as { lng?: number } | undefined)?.lng === 'number'
          ? (location as { lng: number }).lng
          : null;
    const locationLabel =
      typeof lat === 'number' && typeof lng === 'number' ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Unknown location';

    return {
      id: snap.id,
      caption: String(data.caption ?? ''),
      photoUrl: String(data.photoUrl ?? ''),
      createdAtLabel,
      locationLabel,
    };
  });
}

function mapAnimalDocToFeedSighting(animalId: string, data: Record<string, unknown>): FeedSighting {
  const createdAt = extractCreatedAt(data);
  const createdAtLabel = createdAt ? createdAt.toLocaleString() : 'Just now';
  return {
    id: animalId,
    animalId,
    reporterUid: String(data.createdBy ?? ''),
    reporterEmail: String(data.createdByEmail ?? 'Unknown reporter'),
    type: (data.type as AnimalType) ?? 'other',
    caption: String(data.latestSightingCaption ?? ''),
    photoUrl: String(data.coverPhotoUrl ?? ''),
    createdAtLabel,
    aiRiskUrgency:
      data.aiRisk && typeof (data.aiRisk as Record<string, unknown>).urgency === 'string'
        ? ((data.aiRisk as Record<string, unknown>).urgency as FeedSighting['aiRiskUrgency'])
        : undefined,
    aiRiskReasonPreview:
      data.aiRisk && typeof (data.aiRisk as Record<string, unknown>).reason === 'string'
        ? String((data.aiRisk as Record<string, unknown>).reason).slice(0, 120)
        : undefined,
  };
}

function extractCreatedAt(data: Record<string, unknown>): Date | null {
  const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
  return typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
}

function extractCreatedAtTimestamp(data: Record<string, unknown>): number {
  return extractCreatedAt(data)?.getTime() ?? 0;
}
