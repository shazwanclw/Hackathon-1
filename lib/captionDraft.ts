const CAPTION_MAX_LENGTH = 140;

export function sanitizeCaptionDraft(value: string) {
  const trimmed = String(value ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '');

  return trimmed.slice(0, CAPTION_MAX_LENGTH);
}