import { RiskAnimalType, Urgency } from './types';

export const AI_RISK_DISCLAIMER = 'Not a medical diagnosis. For triage only. Requires human verification.';

type ParsedAiRisk = {
  animalType: RiskAnimalType;
  visibleIndicators: string[];
  urgency: Urgency;
  reason: string;
  confidence: number;
  needsHumanVerification: true;
  disclaimer: string;
};

const allowedAnimalTypes = new Set<RiskAnimalType>(['cat', 'dog', 'other', 'unknown']);
const allowedUrgencies = new Set<Urgency>(['high', 'medium', 'low']);

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Gemini output must be a JSON object.');
  }
}

export function parseGeminiRiskJson(rawText: string): ParsedAiRisk {
  let parsedUnknown: unknown;
  try {
    parsedUnknown = JSON.parse(rawText);
  } catch {
    throw new Error('Gemini output was not valid JSON.');
  }

  assertObject(parsedUnknown);
  const parsed = parsedUnknown;

  const animalType = String(parsed.animalType ?? '').trim().toLowerCase() as RiskAnimalType;
  if (!allowedAnimalTypes.has(animalType)) {
    throw new Error('Invalid animalType in Gemini output.');
  }

  const urgency = String(parsed.urgency ?? '').trim().toLowerCase() as Urgency;
  if (!allowedUrgencies.has(urgency)) {
    throw new Error('Invalid urgency in Gemini output.');
  }

  const visibleIndicatorsRaw = parsed.visibleIndicators;
  if (!Array.isArray(visibleIndicatorsRaw) || visibleIndicatorsRaw.some((v) => typeof v !== 'string')) {
    throw new Error('Invalid visibleIndicators in Gemini output.');
  }
  const visibleIndicators = visibleIndicatorsRaw.map((v) => v.trim()).filter(Boolean).slice(0, 10);

  const reason = String(parsed.reason ?? '').trim();
  if (!reason) {
    throw new Error('Missing reason in Gemini output.');
  }

  const confidenceNum = Number(parsed.confidence);
  if (!Number.isFinite(confidenceNum)) {
    throw new Error('Invalid confidence in Gemini output.');
  }
  const confidence = Math.max(0, Math.min(1, confidenceNum));

  return {
    animalType,
    visibleIndicators,
    urgency,
    reason,
    confidence,
    needsHumanVerification: true,
    disclaimer: String(parsed.disclaimer ?? AI_RISK_DISCLAIMER).trim() || AI_RISK_DISCLAIMER,
  };
}

