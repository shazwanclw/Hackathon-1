"use client";

import * as mobilenet from '@tensorflow-models/mobilenet';
import '@tensorflow/tfjs';
import { AnimalType } from './types';

type ClassificationResult = {
  animalType: AnimalType;
  confidence: number;
  rawTopLabel: string;
};

let modelPromise: Promise<mobilenet.MobileNet> | null = null;

const CAT_HINTS = ['cat', 'kitten', 'tabby', 'tiger cat', 'egyptian cat', 'lynx'];
const DOG_HINTS = ['dog', 'puppy', 'retriever', 'shepherd', 'terrier', 'hound', 'bulldog', 'poodle', 'husky', 'malamute', 'beagle', 'doberman', 'rottweiler'];

export async function loadModel() {
  if (!modelPromise) {
    modelPromise = mobilenet.load({ version: 2, alpha: 1.0 });
  }
  return modelPromise;
}

function mapLabelToAnimalType(label: string): AnimalType {
  const lower = label.toLowerCase();
  if (CAT_HINTS.some((hint) => lower.includes(hint))) return 'cat';
  if (DOG_HINTS.some((hint) => lower.includes(hint))) return 'dog';
  return 'other';
}

export async function classifyImage(file: File): Promise<ClassificationResult> {
  try {
    const model = await loadModel();
    const imageUrl = URL.createObjectURL(file);
    const img = document.createElement('img');

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.src = imageUrl;
    });

    const preds = await model.classify(img, 3);
    URL.revokeObjectURL(imageUrl);

    const top = preds[0];
    if (!top) {
      return { animalType: 'other', confidence: 0, rawTopLabel: 'unknown' };
    }

    return {
      animalType: mapLabelToAnimalType(top.className),
      confidence: Number(top.probability.toFixed(4)),
      rawTopLabel: top.className,
    };
  } catch {
    return { animalType: 'other', confidence: 0, rawTopLabel: 'inference_failed' };
  }
}
