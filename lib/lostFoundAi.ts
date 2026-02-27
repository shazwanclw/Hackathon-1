import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type LostPetMatchResult = {
  animalId: string;
  score: number;
  reason: string;
  type: string;
  coverPhotoUrl: string;
  lastSeenLocation: { lat: number; lng: number } | null;
  reporterEmail: string;
};

export function pickAutoSightingAnimalId(
  matches: LostPetMatchResult[],
  minScore: number
): string | null {
  if (!Array.isArray(matches) || matches.length === 0) return null;
  const [top] = matches;
  if (!top?.animalId) return null;
  return top.score >= minScore ? top.animalId : null;
}

async function fileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function findLostPetMatches(input: {
  file: File;
  animalType?: 'cat' | 'dog' | 'other' | 'any';
}) {
  const imageBase64 = await fileToBase64(input.file);
  const call = httpsCallable(functions, 'findLostPetMatches');
  const response = await call({
    imageBase64,
    mimeType: input.file.type || 'image/jpeg',
    animalType: input.animalType || 'any',
  });

  const payload = response.data as { matches?: LostPetMatchResult[] };
  return payload.matches ?? [];
}
