export type CaseStatus = 'new' | 'verified' | 'assigned' | 'resolved' | 'rejected';
export type AnimalType = 'cat' | 'dog' | 'other';
export type Urgency = 'low' | 'medium' | 'high';
export type CountEstimate = '1' | '2-3' | 'many';
export type BehaviorType = 'calm' | 'aggressive' | 'unknown';
export type ResolutionOutcome = 'rescued' | 'treated' | 'relocated' | 'false_report' | 'unknown';

export interface CaseDoc {
  createdAt?: unknown;
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
  };
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
