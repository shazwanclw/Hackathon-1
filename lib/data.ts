import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  GeoPoint,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from './firebase';
import { AdoptionPost, AdoptionStatus, AnimalDoc, AnimalMapMarker, AnimalProfile, AnimalSightingDoc, AnimalSightingItem, AnimalType, CaseDoc, CaseEvent, CaseFilters, FeedComment, FeedSighting, LostFoundMatchHistoryItem, LostFoundPost, PetType, PublicMapCase, RiskAnimalType, ShelterProfile, Urgency, UserProfileDoc, UserProfileSummary } from './types';

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

export async function createLostFoundPostId() {
  return doc(collection(db, 'lost_found_posts')).id;
}

export async function createAdoptionPostId() {
  return doc(collection(db, 'adoption_posts')).id;
}

export async function uploadLostFoundImage(postId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `lost_found/${postId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

export async function uploadAdoptionImage(postId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `adoption/${postId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

export function buildLostFoundPostPayload(input: {
  createdBy: string;
  authorEmail: string;
  petName: string;
  description: string;
  contactInfo: string;
  locationText: string;
  photoUrls: string[];
  photoPaths: string[];
}) {
  const photoUrls = input.photoUrls.slice(0, 3);
  const photoPaths = input.photoPaths.slice(0, 3);
  return {
    createdBy: input.createdBy,
    authorEmail: input.authorEmail,
    petName: input.petName,
    description: input.description,
    contactInfo: input.contactInfo,
    locationText: input.locationText,
    photoUrl: photoUrls[0] ?? '',
    photoUrls,
    photoPaths,
    createdAt: serverTimestamp(),
  };
}

export function mapLostFoundDocToPost(id: string, data: Record<string, unknown>): LostFoundPost {
  const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
  const createdAt = typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
  const createdAtLabel = createdAt ? createdAt.toLocaleString() : 'Just now';
  const photoUrls = Array.isArray(data.photoUrls) ? data.photoUrls.map((item) => String(item)).filter(Boolean).slice(0, 3) : [];
  const fallbackPhoto = String(data.photoUrl ?? '');
  const normalizedPhotoUrls = photoUrls.length ? photoUrls : fallbackPhoto ? [fallbackPhoto] : [];

  return {
    id,
    createdBy: String(data.createdBy ?? ''),
    authorEmail: String(data.authorEmail ?? 'Unknown'),
    petName: String(data.petName ?? ''),
    description: String(data.description ?? ''),
    contactInfo: String(data.contactInfo ?? ''),
    locationText: String(data.locationText ?? ''),
    photoUrl: normalizedPhotoUrls[0] ?? '',
    photoUrls: normalizedPhotoUrls,
    createdAtLabel,
  } as LostFoundPost;
}export async function createLostFoundPost(input: {
  id: string;
  createdBy: string;
  authorEmail: string;
  petName: string;
  description: string;
  contactInfo: string;
  locationText: string;
  photoUrls: string[];
  photoPaths: string[];
}) {
  await setDoc(
    doc(db, 'lost_found_posts', input.id),
    buildLostFoundPostPayload({
      createdBy: input.createdBy,
      authorEmail: input.authorEmail,
      petName: input.petName,
      description: input.description,
      contactInfo: input.contactInfo,
      locationText: input.locationText,
      photoUrls: input.photoUrls,
      photoPaths: input.photoPaths,
    })
  );
}
export async function listLostFoundPosts(): Promise<LostFoundPost[]> {
  const snaps = await getDocs(query(collection(db, 'lost_found_posts'), orderBy('createdAt', 'desc'), limit(200)));
  return snaps.docs.map((snap) => mapLostFoundDocToPost(snap.id, snap.data() as Record<string, unknown>));
}

export async function createAdoptionPost(input: {
  id: string;
  createdBy: string;
  createdByEmail: string;
  shelterUid: string;
  shelterName: string;
  petName: string;
  petType: PetType;
  ageText: string;
  description: string;
  photoUrl: string;
  photoPath: string;
  contactEmail: string;
  phone: string;
  address: string;
  status?: AdoptionStatus;
}) {
  await setDoc(doc(db, 'adoption_posts', input.id), {
    createdBy: input.createdBy,
    createdByEmail: input.createdByEmail,
    shelterUid: input.shelterUid,
    shelterName: input.shelterName,
    petName: input.petName,
    petType: input.petType,
    ageText: input.ageText,
    description: input.description,
    photoUrl: input.photoUrl,
    photoPath: input.photoPath,
    contactEmail: input.contactEmail,
    phone: input.phone,
    address: input.address,
    status: input.status ?? 'available',
    createdAt: serverTimestamp(),
  });
}

export async function listAdoptionPosts(status: AdoptionStatus | 'all' = 'all'): Promise<AdoptionPost[]> {
  const snaps = await getDocs(query(collection(db, 'adoption_posts'), orderBy('createdAt', 'desc'), limit(200)));
  const rows = snaps.docs.map((snap) => {
    const data = snap.data() as Record<string, unknown>;
    const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
    const createdAt = typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
    const createdAtLabel = createdAt ? createdAt.toLocaleString() : 'Just now';
    return {
      id: snap.id,
      createdBy: String(data.createdBy ?? ''),
      createdByEmail: String(data.createdByEmail ?? ''),
      shelterUid: String(data.shelterUid ?? ''),
      shelterName: String(data.shelterName ?? ''),
      petName: String(data.petName ?? ''),
      petType: String(data.petType ?? 'other') as PetType,
      ageText: String(data.ageText ?? ''),
      description: String(data.description ?? ''),
      photoUrl: String(data.photoUrl ?? ''),
      contactEmail: String(data.contactEmail ?? ''),
      phone: String(data.phone ?? ''),
      address: String(data.address ?? ''),
      status: String(data.status ?? 'available') as AdoptionStatus,
      createdAtLabel,
    } as AdoptionPost;
  });
  return status === 'all' ? rows : rows.filter((row) => row.status === status);
}

export async function getAdoptionPostById(postId: string): Promise<AdoptionPost | null> {
  const snap = await getDoc(doc(db, 'adoption_posts', postId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
  const createdAt = typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
  const createdAtLabel = createdAt ? createdAt.toLocaleString() : 'Just now';
  return {
    id: snap.id,
    createdBy: String(data.createdBy ?? ''),
    createdByEmail: String(data.createdByEmail ?? ''),
    shelterUid: String(data.shelterUid ?? ''),
    shelterName: String(data.shelterName ?? ''),
    petName: String(data.petName ?? ''),
    petType: String(data.petType ?? 'other') as PetType,
    ageText: String(data.ageText ?? ''),
    description: String(data.description ?? ''),
    photoUrl: String(data.photoUrl ?? ''),
    contactEmail: String(data.contactEmail ?? ''),
    phone: String(data.phone ?? ''),
    address: String(data.address ?? ''),
    status: String(data.status ?? 'available') as AdoptionStatus,
    createdAtLabel,
  };
}

export async function upsertShelterProfile(input: {
  uid: string;
  enabled: boolean;
  shelterName: string;
  contactEmail: string;
  phone: string;
  address: string;
}) {
  const refDoc = doc(db, 'shelters', input.uid);
  const existing = await getDoc(refDoc);
  await setDoc(
    refDoc,
    {
      enabled: input.enabled,
      shelterName: input.shelterName,
      contactEmail: input.contactEmail,
      phone: input.phone,
      address: input.address,
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function listShelterProfiles(): Promise<ShelterProfile[]> {
  const snaps = await getDocs(query(collection(db, 'shelters'), orderBy('updatedAt', 'desc'), limit(200)));
  return snaps.docs.map((snap) => {
    const data = snap.data() as Record<string, unknown>;
    return {
      uid: snap.id,
      enabled: Boolean(data.enabled),
      shelterName: String(data.shelterName ?? ''),
      contactEmail: String(data.contactEmail ?? ''),
      phone: String(data.phone ?? ''),
      address: String(data.address ?? ''),
    };
  });
}

export async function getShelterProfileByUid(uid: string): Promise<ShelterProfile | null> {
  const snap = await getDoc(doc(db, 'shelters', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    uid: snap.id,
    enabled: Boolean(data.enabled),
    shelterName: String(data.shelterName ?? ''),
    contactEmail: String(data.contactEmail ?? ''),
    phone: String(data.phone ?? ''),
    address: String(data.address ?? ''),
  };
}

export async function saveLostFoundMatchHistory(input: {
  createdBy: string;
  animalType: 'any' | 'cat' | 'dog';
  matches: Array<{
    animalId: string;
    score: number;
    reason: string;
    type: string;
    coverPhotoUrl: string;
    lastSeenLocation: { lat: number; lng: number } | null;
  }>;
}) {
  await addDoc(collection(db, 'lost_found_match_history'), {
    createdBy: input.createdBy,
    animalType: input.animalType,
    matches: input.matches.slice(0, 3),
    createdAt: serverTimestamp(),
  });
}

export async function listLostFoundMatchHistory(uid: string): Promise<LostFoundMatchHistoryItem[]> {
  const snaps = await getDocs(
    query(collection(db, 'lost_found_match_history'), where('createdBy', '==', uid), orderBy('createdAt', 'desc'), limit(20))
  );

  return snaps.docs.map((snap) => {
    const data = snap.data() as Record<string, unknown>;
    const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
    const createdAt = typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
    const createdAtLabel = createdAt ? createdAt.toLocaleString() : 'Just now';
    const rawMatches = Array.isArray(data.matches) ? data.matches : [];
    const matches = rawMatches
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as Record<string, unknown>;
        const location = row.lastSeenLocation as { lat?: number; lng?: number } | null | undefined;
        return {
          animalId: String(row.animalId ?? ''),
          score: Number(row.score ?? 0),
          reason: String(row.reason ?? ''),
          type: String(row.type ?? 'other'),
          coverPhotoUrl: String(row.coverPhotoUrl ?? ''),
          lastSeenLocation:
            location && typeof location.lat === 'number' && typeof location.lng === 'number'
              ? { lat: location.lat, lng: location.lng }
              : null,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .slice(0, 3);

    return {
      id: snap.id,
      createdBy: String(data.createdBy ?? ''),
      animalType: String(data.animalType ?? 'any') as 'any' | 'cat' | 'dog',
      matches,
      createdAtLabel,
    };
  });
}

type NewAnimalPayloadInput = {
  type: AnimalType;
  caption: string;
  photoUrl: string;
  photoPath: string;
  photoUrls?: string[];
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
  photoUrls?: string[];
  photoPaths?: string[];
  location: { lat: number; lng: number };
  authorUid: string;
  authorEmail: string;
};

export function buildNewAnimalPayload(input: NewAnimalPayloadInput) {
  const photoUrls = input.photoUrls && input.photoUrls.length > 0 ? input.photoUrls.slice(0, 3) : [input.photoUrl];
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
    latestSightingPhotoUrls: photoUrls,
  };
}

export function buildNewSightingPayload(input: NewSightingPayloadInput) {
  const photoUrls = input.photoUrls && input.photoUrls.length > 0 ? input.photoUrls.slice(0, 3) : [input.photoUrl];
  const photoPaths = input.photoPaths && input.photoPaths.length > 0 ? input.photoPaths.slice(0, 3) : [input.photoPath];
  return {
    animalId: input.animalId,
    authorUid: input.authorUid,
    authorEmail: input.authorEmail,
    type: input.type,
    caption: input.caption,
    photoUrl: input.photoUrl,
    photoPath: input.photoPath,
    photoUrls,
    photoPaths,
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
    photoUrls: input.photoUrls,
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

export async function addSightingToAnimal(input: NewSightingPayloadInput) {
  const animalRef = doc(db, 'animals', input.animalId);
  const sightingRef = doc(collection(db, 'animals', input.animalId, 'sightings'));
  const sightingPayload = buildNewSightingPayload(input);
  const nextPhotoUrls =
    input.photoUrls && input.photoUrls.length > 0 ? input.photoUrls.slice(0, 3) : [input.photoUrl];

  await runTransaction(db, async (tx) => {
    const animalSnap = await tx.get(animalRef);
    if (!animalSnap.exists()) {
      throw new Error(`Animal ${input.animalId} not found.`);
    }

    tx.set(sightingRef, {
      ...(sightingPayload as Omit<AnimalSightingDoc, 'createdAt' | 'location'>),
      createdAt: serverTimestamp(),
      location: new GeoPoint(input.location.lat, input.location.lng),
    });

    tx.set(
      animalRef,
      {
        coverPhotoUrl: input.photoUrl,
        lastSeenAt: serverTimestamp(),
        lastSeenLocation: new GeoPoint(input.location.lat, input.location.lng),
        latestSightingCaption: input.caption,
        latestSightingPhotoPath: input.photoPath,
        latestSightingPhotoUrls: nextPhotoUrls,
        sightingCount: increment(1),
      },
      { merge: true }
    );
  });

  return { animalId: input.animalId, sightingId: sightingRef.id };
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

export async function listFeedSightings(viewerUid = ''): Promise<FeedSighting[]> {
  const snaps = await getDocs(query(collection(db, 'animals'), orderBy('createdAt', 'desc'), limit(100)));
  const baseRows = snaps.docs.map((snap) => mapAnimalDocToFeedSighting(snap.id, snap.data() as Record<string, unknown>));
  const withProfiles = await attachReporterProfiles(baseRows);
  return attachSocialMetadata(withProfiles, viewerUid);
}

export async function listUserFeedSightings(uid: string): Promise<FeedSighting[]> {
  const snaps = await getDocs(query(collection(db, 'animals'), where('createdBy', '==', uid), limit(200)));
  const baseRows: Array<FeedSighting & { createdAtTs: number }> = snaps.docs.map((snap) => {
    const data = snap.data() as Record<string, unknown>;
    const mapped = mapAnimalDocToFeedSighting(snap.id, data);
    return {
      ...mapped,
      createdAtTs: extractCreatedAtTimestamp(data),
    };
  });

  const rows = await attachReporterProfiles(baseRows);
  rows.sort((a, b) => (b.createdAtTs ?? 0) - (a.createdAtTs ?? 0));
  return rows.map(({ createdAtTs: _createdAtTs, ...row }) => row);
}

export async function toggleLikeInAnimalFeed(animalId: string, uid: string, currentlyLiked: boolean) {
  if (!animalId || !uid) return;
  const likeRef = doc(db, 'animals', animalId, 'likes', uid);
  if (currentlyLiked) {
    await deleteDoc(likeRef);
    return;
  }
  await setDoc(likeRef, {
    uid,
    createdAt: serverTimestamp(),
  });
}

export async function addCommentToAnimalFeed(animalId: string, authorUid: string, authorEmail: string, content: string) {
  if (!animalId || !authorUid || !content.trim()) return;
  await addDoc(collection(db, 'animals', animalId, 'comments'), {
    authorUid,
    authorEmail,
    content: content.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function deleteAnimalPost(animalId: string) {
  if (!animalId) return;
  await deleteDoc(doc(db, 'animals', animalId));
}

export async function getUserProfileSummary(uid: string, fallbackEmail = ''): Promise<UserProfileSummary> {
  const snaps = await getDocs(query(collection(db, 'animals'), where('createdBy', '==', uid), limit(200)));
  const docs = snaps.docs.map((snap) => snap.data() as Record<string, unknown>);
  const firstWithEmail = docs.find((item) => typeof item.createdByEmail === 'string' && item.createdByEmail);
  const derivedFallbackEmail = firstWithEmail
    ? String(firstWithEmail.createdByEmail)
    : fallbackEmail || 'Unknown reporter';
  const profile = await getUserProfile(uid, derivedFallbackEmail);
  const [followersCount, followingCount] = await Promise.all([getFollowerCount(uid), getFollowingCount(uid)]);

  return {
    uid,
    email: profile.email || derivedFallbackEmail,
    username: profile.username || deriveUsername(profile.email || derivedFallbackEmail),
    photoURL: profile.photoURL || '',
    followersCount,
    followingCount,
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
        aiRiskReasonPreview:
          data.aiRisk && typeof (data.aiRisk as Record<string, unknown>).reason === 'string'
            ? String((data.aiRisk as Record<string, unknown>).reason).slice(0, 120)
            : '',
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

export async function getUserProfile(uid: string, fallbackEmail = ''): Promise<UserProfileDoc> {
  const snap = await getDoc(doc(db, 'users', uid));
  const fallbackUsername = deriveUsername(fallbackEmail || uid);
  if (!snap.exists()) {
    return {
      email: fallbackEmail || '',
      username: fallbackUsername,
      photoURL: '',
    };
  }

  const data = snap.data() as Record<string, unknown>;
  const rawEmail = String(data.email ?? '');
  const safeEmail = isReporterEmailPlaceholder(rawEmail) ? String(fallbackEmail ?? '') : rawEmail;
  return {
    email: safeEmail,
    username: String(data.username ?? fallbackUsername),
    photoURL: String(data.photoURL ?? ''),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function upsertUserProfile(uid: string, email: string) {
  const existing = await getDoc(doc(db, 'users', uid));
  if (existing.exists()) return;
  const username = deriveUsername(email || uid);
  await setDoc(doc(db, 'users', uid), {
    email: email || '',
    username,
    photoURL: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveUserProfile(uid: string, changes: Partial<Pick<UserProfileDoc, 'username' | 'photoURL' | 'email'>>) {
  const current = await getUserProfile(uid, String(changes.email ?? ''));
  await setDoc(
    doc(db, 'users', uid),
    {
      email: String(changes.email ?? current.email ?? ''),
      username: String(changes.username ?? current.username ?? deriveUsername(uid)),
      photoURL: String(changes.photoURL ?? current.photoURL ?? ''),
      updatedAt: serverTimestamp(),
      createdAt: current.createdAt ?? serverTimestamp(),
    },
    { merge: true }
  );
}

export async function uploadUserProfilePhoto(uid: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `users/${uid}/profile/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
  const downloadUrl = await getDownloadURL(storageRef);
  return { storagePath, downloadUrl };
}

export async function followUser(followerUid: string, followingUid: string) {
  if (!followerUid || !followingUid || followerUid === followingUid) return;
  const followId = `${followerUid}_${followingUid}`;
  await setDoc(doc(db, 'follows', followId), {
    followerUid,
    followingUid,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowUser(followerUid: string, followingUid: string) {
  if (!followerUid || !followingUid || followerUid === followingUid) return;
  const followId = `${followerUid}_${followingUid}`;
  await deleteDoc(doc(db, 'follows', followId));
}

export async function isFollowingUser(followerUid: string, followingUid: string): Promise<boolean> {
  if (!followerUid || !followingUid || followerUid === followingUid) return false;
  const followId = `${followerUid}_${followingUid}`;
  const snap = await getDoc(doc(db, 'follows', followId));
  return snap.exists();
}

async function getFollowerCount(uid: string): Promise<number> {
  const snaps = await getDocs(query(collection(db, 'follows'), where('followingUid', '==', uid), limit(1000)));
  return snaps.size;
}

async function getFollowingCount(uid: string): Promise<number> {
  const snaps = await getDocs(query(collection(db, 'follows'), where('followerUid', '==', uid), limit(1000)));
  return snaps.size;
}

function mapAnimalDocToFeedSighting(animalId: string, data: Record<string, unknown>): FeedSighting {
  const createdAt = extractCreatedAt(data);
  const createdAtLabel = createdAt ? createdAt.toLocaleString() : 'Just now';
  const photoUrlsRaw = Array.isArray(data.latestSightingPhotoUrls) ? data.latestSightingPhotoUrls : [];
  const photoUrls = photoUrlsRaw.map((x) => String(x)).filter(Boolean).slice(0, 3);
  const coverPhotoUrl = String(data.coverPhotoUrl ?? '');
  const safePhotoUrls = photoUrls.length > 0 ? photoUrls : coverPhotoUrl ? [coverPhotoUrl] : [];
  return {
    id: animalId,
    animalId,
    reporterUid: String(data.createdBy ?? ''),
    reporterEmail: String(data.createdByEmail ?? 'Unknown reporter'),
    type: (data.type as AnimalType) ?? 'other',
    caption: String(data.latestSightingCaption ?? ''),
    photoUrl: coverPhotoUrl,
    photoUrls: safePhotoUrls,
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

async function attachReporterProfiles(rows: Array<FeedSighting & { createdAtTs?: number }>) {
  const uniqueUids = Array.from(new Set(rows.map((row) => row.reporterUid).filter(Boolean)));
  const profileEntries = await Promise.all(
    uniqueUids.map(async (uid) => {
      const profile = await getUserProfile(uid);
      return [uid, profile] as const;
    })
  );
  const profileMap = new Map(profileEntries);

  return rows.map((row) => {
    const profile = profileMap.get(row.reporterUid);
    return {
      ...row,
      reporterUsername: profile?.username || deriveUsername(row.reporterEmail),
      reporterPhotoURL: profile?.photoURL || '',
    };
  });
}

async function attachSocialMetadata(rows: FeedSighting[], viewerUid: string): Promise<FeedSighting[]> {
  const enriched = await Promise.all(
    rows.map(async (row) => {
      const [likeCount, commentCount, comments, likedByMe] = await Promise.all([
        getLikeCount(row.animalId),
        getCommentCount(row.animalId),
        listRecentFeedComments(row.animalId),
        viewerUid ? hasLiked(row.animalId, viewerUid) : Promise.resolve(false),
      ]);
      return {
        ...row,
        likeCount,
        commentCount,
        comments,
        likedByMe,
      };
    })
  );
  return enriched;
}

async function getLikeCount(animalId: string): Promise<number> {
  const snaps = await getDocs(query(collection(db, 'animals', animalId, 'likes'), limit(500)));
  return snaps.size;
}

async function getCommentCount(animalId: string): Promise<number> {
  const snaps = await getDocs(query(collection(db, 'animals', animalId, 'comments'), limit(500)));
  return snaps.size;
}

async function hasLiked(animalId: string, uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'animals', animalId, 'likes', uid));
  return snap.exists();
}

async function listRecentFeedComments(animalId: string): Promise<FeedComment[]> {
  const snaps = await getDocs(
    query(collection(db, 'animals', animalId, 'comments'), orderBy('createdAt', 'desc'), limit(3))
  );

  return snaps.docs.map((snap) => {
    const data = snap.data() as Record<string, unknown>;
    const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
    const createdAt = typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
    return {
      id: snap.id,
      authorUid: String(data.authorUid ?? ''),
      authorEmail: String(data.authorEmail ?? ''),
      content: String(data.content ?? ''),
      createdAtLabel: createdAt ? createdAt.toLocaleString() : 'Just now',
    };
  });
}

function deriveUsername(emailOrId: string): string {
  const value = String(emailOrId || '').trim();
  if (!value) return 'straylink-user';
  if (value.includes('@')) return value.split('@')[0] || 'straylink-user';
  return value;
}

function isReporterEmailPlaceholder(value: string): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === 'unknown reporter' || normalized === 'unknown';
}

function extractCreatedAt(data: Record<string, unknown>): Date | null {
  const rawCreatedAt = data.createdAt as { toDate?: () => Date } | undefined;
  return typeof rawCreatedAt?.toDate === 'function' ? rawCreatedAt.toDate() : null;
}

function extractCreatedAtTimestamp(data: Record<string, unknown>): number {
  return extractCreatedAt(data)?.getTime() ?? 0;
}



