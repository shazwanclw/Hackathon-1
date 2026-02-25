import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { sanitizeCaptionDraft } from './captionDraft';

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function generateCaptionDraftFromImage(file: File): Promise<string> {
  const imageBase64 = await fileToBase64(file);
  const call = httpsCallable(functions, 'generateCaptionDraft');
  const response = await call({
    imageBase64,
    mimeType: file.type || 'image/jpeg',
  });

  const payload = response.data as { caption?: string };
  return sanitizeCaptionDraft(payload.caption ?? '');
}
