const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

const SYSTEM_PROMPT =
  'You are an animal welfare triage assistant. You MUST NOT provide medical diagnosis. You only describe visible, observable cues in the image. You MUST output ONLY valid JSON that matches the schema. Do not include markdown, code fences, or extra text.';

const USER_PROMPT =
  'Analyze this image of an animal. Return a welfare risk screening (non-diagnostic).\n' +
  'Forbidden: diagnosis, infection claims, disease names, treatment advice.\n' +
  'Allowed: observable cues like visible wound/bleeding, thin body condition, discharge, patchy hair loss, limping posture, trapped in dangerous area, aggressive stance, lethargic posture, etc.\n' +
  'Decide urgency:\n' +
  '- high: visible bleeding/severe injury, trapped, unconscious, hit-by-vehicle scene, immediate danger\n' +
  '- medium: possible limp, very thin, discharge, significant hair loss, unsafe area nearby\n' +
  '- low: alert, standing, no visible injury, calm environment\n' +
  'If uncertain, say so and lower confidence.\n' +
  'Output JSON with exactly these keys:\n' +
  '{\n' +
  '  "animalType": "cat|dog|other|unknown",\n' +
  '  "visibleIndicators": ["..."],\n' +
  '  "urgency": "high|medium|low",\n' +
  '  "reason": "...",\n' +
  '  "confidence": 0.0,\n' +
  '  "needsHumanVerification": true,\n' +
  '  "disclaimer": "Not a medical diagnosis. For triage only. Requires human verification."\n' +
  '}';

const CAPTION_SYSTEM_PROMPT =
  'You write short social media captions for stray animal sighting posts. Output plain text only, one sentence, no hashtags, no emojis.';

const CAPTION_USER_PROMPT =
  'Create one simple caption draft describing what is visible in this image. Keep it neutral and concise (8-18 words).';

const MATCH_SYSTEM_PROMPT =
  'You are a strict image matching assistant for lost pets. Compare one query pet image against multiple candidate stray images. Return only valid JSON.';

const MATCH_USER_PROMPT =
  'Compare the query image to each numbered candidate image and estimate whether they are the same pet. ' +
  'Consider fur color/pattern, body build, face shape, ear/tail characteristics, and visible accessories. ' +
  'Output JSON only: {"matches":[{"candidateNumber":1,"score":0.0,"reason":"..."}]} where score is 0..1. ' +
  'Return at most 3 matches with highest confidence and keep reasons short.';

const DISCLAIMER = 'Not a medical diagnosis. For triage only. Requires human verification.';
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const allowedAnimalTypes = new Set(['cat', 'dog', 'other', 'unknown']);
const allowedUrgencies = new Set(['high', 'medium', 'low']);

function buildAdminOverride() {
  return {
    overridden: false,
    urgency: null,
    animalType: null,
    note: null,
    overriddenBy: null,
    overriddenAt: null,
  };
}

function toAnimalType(value) {
  return value === 'cat' || value === 'dog' || value === 'other' ? value : 'other';
}

function parseGeminiRiskJson(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Gemini output was not valid JSON.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Gemini output must be a JSON object.');
  }

  const animalType = String(parsed.animalType || '').trim().toLowerCase();
  if (!allowedAnimalTypes.has(animalType)) {
    throw new Error('Invalid animalType in Gemini output.');
  }

  const urgency = String(parsed.urgency || '').trim().toLowerCase();
  if (!allowedUrgencies.has(urgency)) {
    throw new Error('Invalid urgency in Gemini output.');
  }

  const visibleIndicators = Array.isArray(parsed.visibleIndicators)
    ? parsed.visibleIndicators.map((v) => String(v).trim()).filter(Boolean).slice(0, 10)
    : null;
  if (!visibleIndicators) {
    throw new Error('Invalid visibleIndicators in Gemini output.');
  }

  const reason = String(parsed.reason || '').trim();
  if (!reason) {
    throw new Error('Missing reason in Gemini output.');
  }

  const confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) {
    throw new Error('Invalid confidence in Gemini output.');
  }

  return {
    animalType,
    visibleIndicators,
    urgency,
    reason,
    confidence: Math.max(0, Math.min(1, confidence)),
    needsHumanVerification: true,
    disclaimer: String(parsed.disclaimer || DISCLAIMER).trim() || DISCLAIMER,
  };
}

function guessMimeType(storagePath) {
  const lower = String(storagePath || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function callGemini({ imageBase64, mimeType, apiKey }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [
            { text: USER_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini returned empty content.');
  }

  return {
    model,
    parsed: parseGeminiRiskJson(text),
  };
}

function sanitizeCaptionDraft(text) {
  return String(text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '')
    .slice(0, 140);
}

async function callGeminiCaption({ imageBase64, mimeType, apiKey }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: CAPTION_SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [
            { text: CAPTION_USER_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini caption API failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini caption returned empty content.');
  }

  return sanitizeCaptionDraft(text);
}

function parseGeminiMatchJson(rawText, maxCandidateNumber) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error('Gemini match output was not valid JSON.');
  }

  const items = Array.isArray(parsed?.matches) ? parsed.matches : [];
  return items
    .map((item) => {
      const candidateNumber = Number(item?.candidateNumber);
      const score = Number(item?.score);
      const reason = String(item?.reason || '').trim();
      if (!Number.isFinite(candidateNumber) || candidateNumber < 1 || candidateNumber > maxCandidateNumber) return null;
      if (!Number.isFinite(score)) return null;
      return {
        candidateNumber,
        score: Math.max(0, Math.min(1, score)),
        reason,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function normalizeAnimalTypeFilter(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'cat' || normalized === 'dog' || normalized === 'other') return normalized;
  return 'any';
}

async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image fetch failed (${response.status})`);
  }
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const mimeType = contentType.startsWith('image/') ? contentType : 'image/jpeg';
  const arrayBuffer = await response.arrayBuffer();
  return {
    mimeType,
    base64: Buffer.from(arrayBuffer).toString('base64'),
  };
}

async function callGeminiLostPetMatch({ queryImageBase64, queryMimeType, candidates, apiKey }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts = [
    { text: MATCH_USER_PROMPT },
    {
      text: 'Query image:',
    },
    {
      inline_data: {
        mime_type: queryMimeType,
        data: queryImageBase64,
      },
    },
  ];

  candidates.forEach((candidate, index) => {
    parts.push({
      text: `Candidate ${index + 1}: animalId=${candidate.id}, type=${candidate.type || 'other'}`,
    });
    parts.push({
      inline_data: {
        mime_type: candidate.mimeType,
        data: candidate.imageBase64,
      },
    });
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: MATCH_SYSTEM_PROMPT }],
      },
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini match API failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini match returned empty content.');
  }

  return parseGeminiMatchJson(text, candidates.length);
}

exports.generateCaptionDraft = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    concurrency: 30,
    secrets: [geminiApiKey],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign-in required.');
    }

    const imageBase64 = String(request.data?.imageBase64 || '').trim();
    const mimeType = String(request.data?.mimeType || 'image/jpeg').trim().toLowerCase();
    if (!imageBase64) {
      throw new HttpsError('invalid-argument', 'imageBase64 is required.');
    }

    const allowedMime = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedMime.has(mimeType)) {
      throw new HttpsError('invalid-argument', 'Unsupported image type.');
    }

    if (imageBase64.length > 6 * 1024 * 1024) {
      throw new HttpsError('invalid-argument', 'Image payload too large.');
    }

    try {
      const caption = await callGeminiCaption({
        imageBase64,
        mimeType,
        apiKey: geminiApiKey.value(),
      });
      return { caption };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Caption generation failed.';
      logger.error(`Caption generation failed: ${message}`);
      throw new HttpsError('internal', 'Failed to generate caption draft.');
    }
  }
);

exports.findLostPetMatches = onCall(
  {
    region: 'us-central1',
    maxInstances: 10,
    concurrency: 20,
    secrets: [geminiApiKey],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Sign-in required.');
    }

    const queryImageBase64 = String(request.data?.imageBase64 || '').trim();
    const queryMimeType = String(request.data?.mimeType || 'image/jpeg').trim().toLowerCase();
    const animalTypeFilter = normalizeAnimalTypeFilter(request.data?.animalType);
    if (!queryImageBase64) {
      throw new HttpsError('invalid-argument', 'imageBase64 is required.');
    }
    if (queryImageBase64.length > 6 * 1024 * 1024) {
      throw new HttpsError('invalid-argument', 'Image payload too large.');
    }

    const candidateSnap = await db.collection('animals').orderBy('createdAt', 'desc').limit(30).get();
    let candidates = candidateSnap.docs
      .map((snap) => {
        const data = snap.data();
        return {
          id: snap.id,
          type: String(data.type || 'other'),
          coverPhotoUrl: String(data.coverPhotoUrl || ''),
          lastSeenLocation: data.lastSeenLocation || null,
          createdByEmail: String(data.createdByEmail || ''),
        };
      })
      .filter((item) => !!item.coverPhotoUrl);

    if (animalTypeFilter !== 'any') {
      candidates = candidates.filter((item) => item.type === animalTypeFilter);
    }
    candidates = candidates.slice(0, 12);

    const hydratedCandidates = [];
    for (const candidate of candidates) {
      try {
        const fetched = await fetchImageAsBase64(candidate.coverPhotoUrl);
        hydratedCandidates.push({
          ...candidate,
          mimeType: fetched.mimeType,
          imageBase64: fetched.base64,
        });
      } catch (error) {
        logger.warn(`Skipping candidate ${candidate.id}: ${error instanceof Error ? error.message : 'fetch failed'}`);
      }
    }

    if (!hydratedCandidates.length) {
      return { matches: [] };
    }

    try {
      const aiMatches = await callGeminiLostPetMatch({
        queryImageBase64,
        queryMimeType,
        candidates: hydratedCandidates,
        apiKey: geminiApiKey.value(),
      });

      const matches = aiMatches
        .map((item) => {
          const candidate = hydratedCandidates[item.candidateNumber - 1];
          if (!candidate) return null;
          return {
            animalId: candidate.id,
            score: item.score,
            reason: item.reason,
            type: candidate.type,
            coverPhotoUrl: candidate.coverPhotoUrl,
            lastSeenLocation:
              typeof candidate.lastSeenLocation?.latitude === 'number' && typeof candidate.lastSeenLocation?.longitude === 'number'
                ? { lat: candidate.lastSeenLocation.latitude, lng: candidate.lastSeenLocation.longitude }
                : typeof candidate.lastSeenLocation?.lat === 'number' && typeof candidate.lastSeenLocation?.lng === 'number'
                  ? { lat: candidate.lastSeenLocation.lat, lng: candidate.lastSeenLocation.lng }
                  : null,
            reporterEmail: candidate.createdByEmail,
          };
        })
        .filter(Boolean)
        .slice(0, 3);

      return { matches };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lost pet match failed.';
      logger.error(`Lost pet match failed: ${message}`);
      throw new HttpsError('internal', 'Failed to match against stray database.');
    }
  }
);

exports.screenCaseAiRisk = onDocumentWritten(
  {
    document: 'cases/{caseId}',
    region: 'us-central1',
    maxInstances: 5,
    concurrency: 10,
    secrets: [geminiApiKey],
  },
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;

    const caseId = event.params.caseId;
    const caseData = after.data();
    const animalId = caseData?.animalId;
    const storagePath = caseData?.photo?.storagePath;
    if (!storagePath) return;

    const currentRisk = caseData?.aiRisk;
    if (currentRisk?.createdAt || currentRisk?.error || currentRisk?.processing) return;

    const caseRef = db.collection('cases').doc(caseId);
    const lockAcquired = await db.runTransaction(async (tx) => {
      const snap = await tx.get(caseRef);
      if (!snap.exists) return false;
      const live = snap.data();
      if (!live?.photo?.storagePath) return false;
      const risk = live?.aiRisk;
      if (risk?.createdAt || risk?.error || risk?.processing) return false;
      tx.set(
        caseRef,
        {
          aiRisk: {
            processing: true,
            error: null,
            needsHumanVerification: true,
            disclaimer: DISCLAIMER,
            adminOverride: buildAdminOverride(),
          },
        },
        { merge: true }
      );
      return true;
    });

    if (!lockAcquired) return;

    const trackId = `${caseId}_${caseData.trackingToken}`;

    try {
      const file = storage.bucket().file(storagePath);
      const [bytes] = await file.download();
      const mimeType = guessMimeType(storagePath);
      const { model, parsed } = await callGemini({
        imageBase64: bytes.toString('base64'),
        mimeType,
        apiKey: geminiApiKey.value(),
      });

      const aiRiskDoc = {
        model,
        animalType: parsed.animalType,
        visibleIndicators: parsed.visibleIndicators,
        urgency: parsed.urgency,
        reason: parsed.reason,
        confidence: parsed.confidence,
        disclaimer: parsed.disclaimer,
        needsHumanVerification: true,
        createdAt: FieldValue.serverTimestamp(),
        error: null,
        processing: FieldValue.delete(),
        adminOverride: buildAdminOverride(),
      };
      const finalAnimalType = toAnimalType(parsed.animalType);

      await caseRef.set(
        {
          ai: {
            model,
            animalType: finalAnimalType,
            confidence: parsed.confidence,
            rawTopLabel: parsed.animalType,
          },
          aiRisk: aiRiskDoc,
          triage: {
            urgency: parsed.urgency,
            reason: parsed.reason,
            needsHumanVerification: true,
            source: 'aiRisk',
          },
        },
        { merge: true }
      );

      if (animalId) {
        await db.collection('animals').doc(animalId).set(
          {
            type: finalAnimalType,
            aiRisk: {
              model,
              animalType: parsed.animalType,
              visibleIndicators: parsed.visibleIndicators,
              urgency: parsed.urgency,
              reason: parsed.reason,
              confidence: parsed.confidence,
              disclaimer: parsed.disclaimer,
              needsHumanVerification: true,
              error: null,
              createdAt: FieldValue.serverTimestamp(),
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await db.collection('public_tracks').doc(trackId).set(
        {
          ai: {
            animalType: finalAnimalType,
            confidence: parsed.confidence,
          },
          aiRisk: {
            ...aiRiskDoc,
            createdAt: Timestamp.now(),
          },
          triage: {
            urgency: parsed.urgency,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await db.collection('public_map_cases').doc(caseId).set(
        {
          ai: {
            animalType: finalAnimalType,
          },
          triage: {
            urgency: parsed.urgency,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await db.collection('case_events').add({
        caseId,
        timestamp: FieldValue.serverTimestamp(),
        actorUid: 'system',
        action: 'AI_RISK_SCREENED',
        changes: {
          urgency: parsed.urgency,
          animalType: parsed.animalType,
          confidence: parsed.confidence,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Gemini processing error.';
      logger.error(`AI risk screening failed for case ${caseId}: ${message}`);
      const failedAiRisk = {
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        animalType: 'unknown',
        visibleIndicators: ['image unclear'],
        urgency: 'low',
        reason: 'Gemini risk screening failed; requires manual triage.',
        confidence: 0,
        disclaimer: DISCLAIMER,
        needsHumanVerification: true,
        createdAt: FieldValue.serverTimestamp(),
        error: message.slice(0, 500),
        processing: FieldValue.delete(),
        adminOverride: buildAdminOverride(),
      };
      await caseRef.set(
        {
          ai: {
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            animalType: 'other',
            confidence: 0,
            rawTopLabel: 'gemini_error',
          },
          aiRisk: failedAiRisk,
        },
        { merge: true }
      );
      await db.collection('public_tracks').doc(trackId).set(
        {
          aiRisk: {
            ...failedAiRisk,
            createdAt: Timestamp.now(),
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      if (animalId) {
        await db.collection('animals').doc(animalId).set(
          {
            aiRisk: {
              model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
              animalType: 'unknown',
              visibleIndicators: ['image unclear'],
              urgency: 'low',
              reason: 'Gemini risk screening failed; requires manual triage.',
              confidence: 0,
              disclaimer: DISCLAIMER,
              needsHumanVerification: true,
              error: message.slice(0, 500),
              createdAt: FieldValue.serverTimestamp(),
            },
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
  }
);
