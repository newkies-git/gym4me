import admin from 'firebase-admin'

/**
 * Migrate Firestore `users` documents:
 *   role: 'SUPERVISOR' -> 'SITE_ADMIN'
 *   lvl: ensure >= 100 (set to 100 if missing or < 100)
 *
 * Auth:
 * - Uses Application Default Credentials by default.
 * - Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json` when running locally.
 *
 * Options:
 * - DRY_RUN=1  : do not write, only print summary
 * - LIMIT=1000 : max docs to process (optional)
 */

const projectId =
  (process.env.FIREBASE_PROJECT_ID || '').trim() ||
  (process.env.GOOGLE_CLOUD_PROJECT || '').trim() ||
  (process.env.GCLOUD_PROJECT || '').trim() ||
  (process.env.VITE_FIREBASE_PROJECT_ID || '').trim()

if (!projectId) {
  console.error(
    [
      '[migrate] Missing project id.',
      'Set one of: FIREBASE_PROJECT_ID, GOOGLE_CLOUD_PROJECT, GCLOUD_PROJECT, VITE_FIREBASE_PROJECT_ID',
      'Example:',
      '  FIREBASE_PROJECT_ID="gym4me-22882" GOOGLE_APPLICATION_CREDENTIALS="/path/serviceAccount.json" DRY_RUN=1 npm run migrate:supervisor-to-site-admin'
    ].join('\n')
  )
  process.exitCode = 1
} else if (!admin.apps.length) {
  const saJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim()
  if (saJson) {
    const serviceAccount = JSON.parse(saJson)
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId
    })
  } else {
    // Falls back to Application Default Credentials (GOOGLE_APPLICATION_CREDENTIALS, gcloud auth, etc.)
    admin.initializeApp({ projectId })
  }
}

const db = admin.firestore()

const DRY_RUN = process.env.DRY_RUN === '1'
const LIMIT = Number(process.env.LIMIT || '') || undefined

async function main() {
  console.log('[migrate] Start: SUPERVISOR -> SITE_ADMIN')
  console.log('[migrate] DRY_RUN:', DRY_RUN ? 'YES' : 'NO')
  if (LIMIT) console.log('[migrate] LIMIT:', LIMIT)

  let processed = 0
  let updated = 0

  let q = db.collection('users').where('role', '==', 'SUPERVISOR')
  if (LIMIT) q = q.limit(LIMIT)

  const snap = await q.get()
  console.log('[migrate] matched docs:', snap.size)

  if (snap.empty) {
    console.log('[migrate] nothing to do')
    return
  }

  // Firestore batch limit is 500 operations.
  const chunks = []
  let current = []
  for (const d of snap.docs) {
    current.push(d)
    if (current.length === 450) {
      chunks.push(current)
      current = []
    }
  }
  if (current.length) chunks.push(current)

  for (let i = 0; i < chunks.length; i++) {
    const docs = chunks[i]
    processed += docs.length

    if (DRY_RUN) {
      console.log(`[migrate] chunk ${i + 1}/${chunks.length}: would update ${docs.length} docs`)
      continue
    }

    const batch = db.batch()
    for (const docSnap of docs) {
      const data = docSnap.data() || {}
      const currentLvl = typeof data.lvl === 'number' ? data.lvl : 0
      const next = {
        role: 'SITE_ADMIN',
        lvl: currentLvl >= 100 ? currentLvl : 100,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
      batch.update(docSnap.ref, next)
      updated++
    }
    await batch.commit()
    console.log(`[migrate] chunk ${i + 1}/${chunks.length}: updated ${docs.length} docs`)
  }

  console.log('[migrate] done')
  console.log('[migrate] processed:', processed)
  console.log('[migrate] updated:', DRY_RUN ? 0 : updated)
}

main().catch((err) => {
  console.error('[migrate] failed:', err)
  process.exitCode = 1
})

