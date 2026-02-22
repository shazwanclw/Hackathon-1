/* eslint-disable no-console */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const flags = new Set();
  const values = {};

  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--project' && argv[i + 1]) {
      values.project = argv[i + 1];
      i += 1;
      continue;
    }
    if (item === '--credentials' && argv[i + 1]) {
      values.credentials = argv[i + 1];
      i += 1;
      continue;
    }
    flags.add(item);
  }

  return {
    write: flags.has('--write'),
    help: flags.has('--help') || flags.has('-h'),
    project: values.project || '',
    credentials: values.credentials || '',
  };
}

function getProjectIdFromFirebaseRc() {
  try {
    const rcPath = path.resolve(__dirname, '../../.firebaserc');
    if (!fs.existsSync(rcPath)) return '';
    const raw = fs.readFileSync(rcPath, 'utf8');
    const json = JSON.parse(raw);
    const fromDefault = json?.projects?.default;
    return typeof fromDefault === 'string' ? fromDefault : '';
  } catch {
    return '';
  }
}

async function getUserEmail(uid, cache, auth) {
  if (!uid) return null;
  if (cache.has(uid)) return cache.get(uid);
  try {
    const user = await auth.getUser(uid);
    const email = user.email || null;
    cache.set(uid, email);
    return email;
  } catch {
    cache.set(uid, null);
    return null;
  }
}

async function run() {
  const { write, help, project, credentials } = parseArgs(process.argv);
  if (help) {
    console.log('Usage: npm run backfill:reporter-emails -- [--write] [--project <id>] [--credentials <path>]');
    console.log('  default: dry-run (no writes)');
    console.log('  --write: apply updates');
    console.log('  --project: explicitly set Firebase project id');
    console.log('  --credentials: path to service account json');
    return;
  }

  if (credentials) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(credentials);
  }

  const resolvedProjectId =
    project ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    getProjectIdFromFirebaseRc();

  if (!resolvedProjectId) {
    console.error('No Firebase project id detected.');
    console.error('Pass --project <id> or set FIREBASE_PROJECT_ID.');
    process.exitCode = 1;
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp({ projectId: resolvedProjectId });
  }

  const db = admin.firestore();
  const auth = admin.auth();
  const dryRun = !write;
  const emailCache = new Map();
  console.log(`Project: ${resolvedProjectId}`);
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log(`Credentials: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
  } else {
    console.log('Credentials: default ADC');
  }
  const snapshot = await db.collection('animals').get();

  let scanned = 0;
  let missingEmail = 0;
  let resolvable = 0;
  let updated = 0;

  let batch = db.batch();
  let batchSize = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const data = doc.data() || {};
    const createdBy = typeof data.createdBy === 'string' ? data.createdBy.trim() : '';
    const createdByEmail = typeof data.createdByEmail === 'string' ? data.createdByEmail.trim() : '';

    if (!createdBy || createdByEmail) continue;
    missingEmail += 1;

    const resolvedEmail = await getUserEmail(createdBy, emailCache, auth);
    if (!resolvedEmail) {
      console.log(`[skip] animals/${doc.id} -> no email found for uid=${createdBy}`);
      continue;
    }

    resolvable += 1;
    if (dryRun) {
      console.log(`[dry-run] would update animals/${doc.id} createdByEmail=${resolvedEmail}`);
      continue;
    }

    batch.update(doc.ref, { createdByEmail: resolvedEmail });
    batchSize += 1;
    updated += 1;

    if (batchSize >= 400) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (!dryRun && batchSize > 0) {
    await batch.commit();
  }

  console.log('--- Backfill summary ---');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'write'}`);
  console.log(`Animals scanned: ${scanned}`);
  console.log(`Missing createdByEmail: ${missingEmail}`);
  console.log(`Resolvable via Auth: ${resolvable}`);
  console.log(`Updated: ${updated}`);
}

run().catch((err) => {
  console.error(err);
  console.error('');
  console.error('Tip: set credentials first:');
  console.error('  1) gcloud auth application-default login');
  console.error('  or');
  console.error('  2) pass --credentials <service-account-json>');
  process.exitCode = 1;
});
