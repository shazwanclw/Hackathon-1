import { describe, expect, it } from 'vitest';
import { parseGeminiRiskJson } from '@/lib/aiRisk';

describe('parseGeminiRiskJson', () => {
  it('accepts strict JSON and normalizes values', () => {
    const raw = JSON.stringify({
      animalType: 'cat',
      visibleIndicators: ['possible limp', 'patchy hair loss'],
      urgency: 'medium',
      reason: 'Animal appears to have an uneven gait and patchy fur in visible areas.',
      confidence: 0.82,
      needsHumanVerification: true,
      disclaimer: 'Not a medical diagnosis. For triage only. Requires human verification.',
    });

    const parsed = parseGeminiRiskJson(raw);
    expect(parsed.animalType).toBe('cat');
    expect(parsed.urgency).toBe('medium');
    expect(parsed.visibleIndicators).toEqual(['possible limp', 'patchy hair loss']);
    expect(parsed.needsHumanVerification).toBe(true);
    expect(parsed.confidence).toBeCloseTo(0.82, 5);
  });

  it('throws when JSON contains invalid enum values', () => {
    const raw = JSON.stringify({
      animalType: 'bird',
      visibleIndicators: ['alert posture'],
      urgency: 'low',
      reason: 'Looks calm.',
      confidence: 0.4,
      needsHumanVerification: true,
      disclaimer: 'Not a medical diagnosis. For triage only. Requires human verification.',
    });

    expect(() => parseGeminiRiskJson(raw)).toThrow(/animalType/i);
  });
});
