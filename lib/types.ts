export type CaseStatus = 'new' | 'verified' | 'assigned' | 'resolved' | 'rejected';
export type AnimalType = 'cat' | 'dog' | 'other';
export type PetType = 'cat' | 'dog' | 'other';
export type RiskAnimalType = AnimalType | 'unknown';
export type Urgency = 'low' | 'medium' | 'high';
export type CountEstimate = '1' | '2-3' | 'many';
export type BehaviorType = 'calm' | 'aggressive' | 'unknown';
export type ResolutionOutcome = 'rescued' | 'treated' | 'relocated' | 'false_report' | 'unknown';
export type AdoptionStatus = 'available' | 'adopted';

export interface AiRiskSummary {
  animalType: RiskAnimalType;
  visibleIndicators: string[];
  urgency: Urgency;
  reason: string;
  confidence: number;
  disclaimer: string;
  needsHumanVerification: true;
  error: string | null;
}

export interface CaseDoc {
  createdAt?: unknown;
  animalId?: string;
  createdBy: string;
  trackingToken: string;
  photo: {
    storagePath: string;
    downloadUrl: string;
  };
  location: {
    lat: number;
    lng: number;
    addressText: string;
    accuracy: 'exact' | 'approx';
  };
  report: {
    count: CountEstimate;
    behavior: BehaviorType;
    immediateDanger: boolean;
    note: string;
  };
  ai: {
    model: string;
    animalType: AnimalType;
    confidence: number;
    rawTopLabel: string;
  };
  triage: {
    urgency: Urgency;
    reason: string;
    needsHumanVerification: true;
    source?: 'ai' | 'aiRisk' | 'admin';
  };
  aiRisk?: (AiRiskSummary & {
    model: string;
    createdAt?: unknown;
    adminOverride: {
      overridden: boolean;
      urgency: Urgency | null;
      animalType: RiskAnimalType | null;
      note: string | null;
      overriddenBy: string | null;
      overriddenAt: unknown | null;
    };
  });
  status: CaseStatus;
  assignedTo: string | null;
  resolution: {
    outcome: ResolutionOutcome;
    notes: string;
    resolvedAt: unknown;
  } | null;
}

export interface CaseEvent {
  caseId: string;
  timestamp?: unknown;
  actorUid: string | null;
  action: string;
  changes: Record<string, unknown>;
}

export interface CaseFilters {
  status?: CaseStatus | 'all';
  urgency?: Urgency | 'all';
  animalType?: AnimalType | 'all';
}

export interface PublicMapCase {
  id: string;
  caseId: string;
  status: CaseStatus;
  ai: {
    animalType: AnimalType;
  };
  triage: {
    urgency: Urgency;
  };
  location: {
    lat: number;
    lng: number;
  };
}

export interface AnimalDoc {
  createdAt?: unknown;
  createdBy: string;
  createdByEmail: string;
  type: AnimalType;
  coverPhotoUrl: string;
  lastSeenLocation: {
    lat: number;
    lng: number;
  };
  lastSeenAt: unknown;
  sightingCount: number;
  latestSightingCaption: string;
  latestSightingPhotoPath: string;
  latestSightingPhotoUrls?: string[];
  aiRisk?: AiRiskSummary & {
    model: string;
    createdAt?: unknown;
  };
}

export interface AnimalSightingDoc {
  createdAt?: unknown;
  animalId: string;
  authorUid: string;
  authorEmail: string;
  type: AnimalType;
  caption: string;
  photoUrl: string;
  photoPath: string;
  photoUrls?: string[];
  photoPaths?: string[];
  location: {
    lat: number;
    lng: number;
  };
  commentCount: number;
}

export interface SightingCommentDoc {
  createdAt?: unknown;
  authorUid: string;
  content: string;
}

export interface FeedSighting {
  id: string;
  animalId: string;
  reporterUid: string;
  reporterEmail: string;
  reporterUsername?: string;
  reporterPhotoURL?: string;
  type: AnimalType;
  caption: string;
  photoUrl: string;
  photoUrls?: string[];
  createdAtLabel: string;
  aiRiskUrgency?: Urgency;
  aiRiskReasonPreview?: string;
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
  comments?: FeedComment[];
}

export interface FeedComment {
  id: string;
  authorUid: string;
  authorEmail: string;
  content: string;
  createdAtLabel: string;
}

export interface UserProfileSummary {
  uid: string;
  email: string;
  username: string;
  photoURL: string;
  followersCount: number;
  followingCount: number;
  reportCount: number;
}

export interface UserProfileDoc {
  email: string;
  username: string;
  photoURL: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AnimalMapMarker {
  id: string;
  type: AnimalType;
  coverPhotoUrl?: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface AnimalProfile {
  id: string;
  type: AnimalType;
  coverPhotoUrl: string;
  lastSeenAtLabel: string;
  sightingCount: number;
  aiRisk?: (AiRiskSummary & {
    model: string;
    createdAtLabel: string;
  }) | null;
}

export interface AnimalSightingItem {
  id: string;
  caption: string;
  photoUrl: string;
  createdAtLabel: string;
  locationLabel: string;
}

export interface LostFoundPost {
  id: string;
  createdBy: string;
  authorEmail: string;
  petName: string;
  description: string;
  contactInfo: string;
  locationText: string;
  photoUrl: string;
  photoUrls: string[];
  createdAtLabel: string;
}

export interface LostFoundSavedMatch {
  animalId: string;
  score: number;
  reason: string;
  type: string;
  coverPhotoUrl: string;
  lastSeenLocation: { lat: number; lng: number } | null;
}

export interface LostFoundMatchHistoryItem {
  id: string;
  createdBy: string;
  animalType: 'any' | 'cat' | 'dog';
  matches: LostFoundSavedMatch[];
  createdAtLabel: string;
}

export interface ShelterProfile {
  uid: string;
  enabled: boolean;
  shelterName: string;
  contactEmail: string;
  phone: string;
  address: string;
}

export interface AdoptionPost {
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
  contactEmail: string;
  phone: string;
  address: string;
  status: AdoptionStatus;
  createdAtLabel: string;
}
