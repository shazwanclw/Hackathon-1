export type CaseStatus = 'new' | 'verified' | 'assigned' | 'resolved' | 'rejected';
export type AnimalType = 'cat' | 'dog' | 'other';
export type RiskAnimalType = AnimalType | 'unknown';
export type Urgency = 'low' | 'medium' | 'high';
export type CountEstimate = '1' | '2-3' | 'many';
export type BehaviorType = 'calm' | 'aggressive' | 'unknown';
export type ResolutionOutcome = 'rescued' | 'treated' | 'relocated' | 'false_report' | 'unknown';

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
    model: 'tfjs-mobilenet';
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
  aiRisk?: AiRiskSummary & {
    model: string;
    createdAt?: unknown;
  };
}

export interface AnimalSightingDoc {
  createdAt?: unknown;
  animalId: string;
  authorUid: string;
  type: AnimalType;
  caption: string;
  photoUrl: string;
  photoPath: string;
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
  type: AnimalType;
  caption: string;
  photoUrl: string;
  createdAtLabel: string;
  aiRiskUrgency?: Urgency;
  aiRiskReasonPreview?: string;
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
