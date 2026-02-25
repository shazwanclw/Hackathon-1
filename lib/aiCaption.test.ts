import { describe, expect, it } from 'vitest';
import { sanitizeCaptionDraft } from '@/lib/captionDraft';

describe('sanitizeCaptionDraft', () => {
  it('trims quotes and whitespace', () => {
    expect(sanitizeCaptionDraft('  "A calm stray dog near the sidewalk"  ')).toBe('A calm stray dog near the sidewalk');
  });

  it('collapses new lines into a single sentence', () => {
    expect(sanitizeCaptionDraft('Cat near market.\nWaiting quietly for food.')).toBe('Cat near market. Waiting quietly for food.');
  });

  it('limits caption length to 140 characters', () => {
    const long = 'a'.repeat(180);
    expect(sanitizeCaptionDraft(long).length).toBe(140);
  });
});
