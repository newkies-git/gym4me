import * as admin from 'firebase-admin'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import sharp from 'sharp'

admin.initializeApp()

function uniqueStrings(items: Array<string | null | undefined>): string[] {
  return Array.from(new Set(items.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim())))
}

function chunkByTen<T>(arr: T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += 10) out.push(arr.slice(i, i + 10))
  return out
}

async function getTokensForEmails(emails: string[]): Promise<string[]> {
  const db = admin.firestore()
  const tokens: string[] = []
  const uniq = uniqueStrings(emails)
  if (uniq.length === 0) return tokens

  for (const emailChunk of chunkByTen(uniq)) {
    const snap = await db.collection('users').where('email', 'in', emailChunk).get()
    snap.docs.forEach((d) => {
      const data = d.data()
      const t = data?.fcmToken
      if (typeof t === 'string' && t.trim().length > 0) tokens.push(t.trim())
    })
  }

  return uniqueStrings(tokens)
}

// Generates optimized thumbnails for uploaded workout media.
export const generateWorkoutThumbnail = onObjectFinalized(async (event: any) => {
  const object = event.data
  const bucketName = object.bucket
  const filePath = object.name

  if (!bucketName || !filePath) return
  if (!filePath.startsWith('workout-media/')) return
  if (filePath.includes('_thumb_')) return

  const bucket = admin.storage().bucket(bucketName)
  const originalFile = bucket.file(filePath)
  const [originalBuffer] = await originalFile.download()

  const thumbnailBuffer = await sharp(originalBuffer)
    .rotate()
    .resize({ width: 360, withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer()

  const thumbPath = filePath.replace(/(\.[^./]+)?$/, '_thumb_360.jpg')
  const thumbFile = bucket.file(thumbPath)
  await thumbFile.save(thumbnailBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public,max-age=604800'
    }
  })
})

export const onClassCreated = onDocumentCreated('classes/{classId}', async (event: any) => {
  const snapshot = event.data
  if (!snapshot) return

  const classData = snapshot.data()
  const traineeEmails = Array.isArray(classData?.traineeEmails) ? (classData.traineeEmails as unknown[]) : []
  const emails = uniqueStrings(traineeEmails.map((x) => (typeof x === 'string' ? x : '')))
  if (emails.length === 0) return

  const tokens = await getTokensForEmails(emails)
  if (tokens.length === 0) return

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '새로운 클래스에 초대되었습니다!',
        body: '트레이너님이 클래스를 생성하고 트레이니를 초대했습니다. 확인해보세요!'
      },
      data: {
        type: 'CLASS_INVITE',
        classId: snapshot.id
      }
    })
    console.log(`Successfully sent messages: ${response.successCount} success, ${response.failureCount} failed.`)
  } catch (error) {
    console.error('Error sending multicast message:', error)
  }
})

export const onScheduleRejected = onDocumentUpdated('schedules/{scheduleId}', async (event: any) => {
  const beforeSnap = event.data?.before
  const afterSnap = event.data?.after
  if (!beforeSnap || !afterSnap) return
  if (!beforeSnap.exists || !afterSnap.exists) return

  const before = beforeSnap.data()
  const after = afterSnap.data()

  const beforeStatus = before?.status
  const afterStatus = after?.status
  if (beforeStatus === afterStatus) return
  if (afterStatus !== 'REJECTED') return

  const targetType = after?.targetType
  const classId = after?.classId

  const recipientEmails: string[] = []
  if (targetType === 'CLASS' && typeof classId === 'string' && classId.trim().length > 0) {
    const classSnap = await admin.firestore().collection('classes').doc(classId).get()
    if (classSnap.exists) {
      const cd = classSnap.data()
      const traineeEmails = Array.isArray(cd?.traineeEmails) ? (cd?.traineeEmails as unknown[]) : []
      recipientEmails.push(...traineeEmails.map((x) => (typeof x === 'string' ? x : '')))
    }
  } else {
    const clientEmail = typeof after?.clientEmail === 'string' ? after.clientEmail : ''
    const userEmail = typeof after?.userEmail === 'string' ? after.userEmail : ''
    recipientEmails.push(clientEmail || userEmail)
  }

  const tokens = await getTokensForEmails(recipientEmails)
  if (tokens.length === 0) return

  const title = typeof after?.title === 'string' ? after.title : '일정'
  const date = typeof after?.date === 'string' ? after.date : ''
  const time = typeof after?.time === 'string' ? after.time : ''
  const rejectionReason = typeof after?.rejectionReason === 'string' ? after.rejectionReason : ''

  const notificationTitle = '일정이 거절되었습니다'
  const notificationBody = rejectionReason
    ? `${title} (${date} ${time})\n사유: ${rejectionReason}`
    : `${title} (${date} ${time})`

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: notificationTitle,
        body: notificationBody
      },
      data: {
        type: 'SCHEDULE_REJECTED',
        scheduleId: afterSnap.id,
        status: 'REJECTED',
        classId: typeof classId === 'string' ? classId : ''
      }
    })
    console.log(`Successfully sent messages: ${response.successCount} success, ${response.failureCount} failed.`)
  } catch (error) {
    console.error('Error sending multicast message:', error)
  }
})

export const notifyManagersLowCreditsDaily = onSchedule(
  { schedule: '0 9 * * *', timeZone: 'Asia/Seoul' },
  async () => {
    const THRESHOLD = 3
    const db = admin.firestore()

    // Find trainees with low remaining sessions.
    const lowSnap = await db.collection('users')
      .where('remainingSessions', '<=', THRESHOLD)
      .where('lvl', '>=', 5)
      .get()

    const lowByGymId = new Map<string, { email: string; remaining: number }[]>()
    lowSnap.docs.forEach((d) => {
      const u = d.data() as any
      const gymId = typeof u.gymId === 'string' ? u.gymId : ''
      const email = typeof u.email === 'string' ? u.email : ''
      const remaining = typeof u.remainingSessions === 'number' ? u.remainingSessions : NaN
      const isActive = u.employmentStatus == null || u.employmentStatus === 'ACTIVE'
      if (!isActive) return
      if (!gymId || !email) return
      if (!Number.isFinite(remaining)) return
      if (remaining < 0) return
      const list = lowByGymId.get(gymId) ?? []
      list.push({ email, remaining })
      lowByGymId.set(gymId, list)
    })

    for (const [gymId, trainees] of lowByGymId.entries()) {
      if (!trainees.length) continue

      // Load managers in this gym.
      const mgrSnap = await db.collection('users')
        .where('gymId', '==', gymId)
        .where('lvl', '>=', 20)
        .get()

      const managerEmails: string[] = []
      mgrSnap.docs.forEach((d) => {
        const u = d.data() as any
        const email = typeof u.email === 'string' ? u.email : ''
        const isActive = u.employmentStatus == null || u.employmentStatus === 'ACTIVE'
        if (!isActive) return
        if (email) managerEmails.push(email)
      })

      const tokens = await getTokensForEmails(managerEmails)
      if (!tokens.length) continue

      const count = trainees.length
      const title = '잔여 PT 이용권 부족 알림'
      const body = `잔여 ${THRESHOLD}회 이하 회원이 ${count}명 있습니다.`

      try {
        const response = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title, body },
          data: {
            type: 'MANAGER_LOW_CREDITS',
            gymId,
            threshold: String(THRESHOLD),
            count: String(count)
          }
        })
        console.log(`[low-credits] gymId=${gymId} sent: ${response.successCount} success, ${response.failureCount} failed.`)
      } catch (e) {
        console.error('[low-credits] failed:', e)
      }
    }
  }
)

export const onAdminJobCreated = onDocumentCreated('adminJobs/{jobId}', async (event: any) => {
  const snap = event.data
  if (!snap) return
  if (!snap.exists) return

  const db = admin.firestore()
  const data = snap.data() as any
  if (data?.type !== 'MANAGER_LOW_CREDITS') return

  const gymId = typeof data.gymId === 'string' ? data.gymId.trim() : ''
  const actorEmail = typeof data.actorEmail === 'string' ? data.actorEmail.trim() : ''
  const threshold = typeof data.threshold === 'number' ? Math.floor(data.threshold) : Number(data.threshold)
  const th = Number.isFinite(threshold) && threshold >= 0 ? threshold : 3

  if (!gymId) {
    await snap.ref.set({ status: 'FAILED', error: 'gymId is required', processedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })
    return
  }

  // prevent double-processing if retried
  if (data?.status === 'DONE') return

  // Find trainees with low remaining sessions in this gym.
  const lowSnap = await db.collection('users')
    .where('gymId', '==', gymId)
    .where('remainingSessions', '<=', th)
    .where('lvl', '>=', 5)
    .get()

  const trainees: { email: string; remaining: number }[] = []
  lowSnap.docs.forEach((d) => {
    const u = d.data() as any
    const email = typeof u.email === 'string' ? u.email : ''
    const remaining = typeof u.remainingSessions === 'number' ? u.remainingSessions : NaN
    const isActive = u.employmentStatus == null || u.employmentStatus === 'ACTIVE'
    if (!isActive) return
    if (!email) return
    if (!Number.isFinite(remaining) || remaining < 0) return
    trainees.push({ email, remaining })
  })

  // Load managers in this gym.
  const mgrSnap = await db.collection('users')
    .where('gymId', '==', gymId)
    .where('lvl', '>=', 20)
    .get()

  const managerEmails: string[] = []
  mgrSnap.docs.forEach((d) => {
    const u = d.data() as any
    const email = typeof u.email === 'string' ? u.email : ''
    const isActive = u.employmentStatus == null || u.employmentStatus === 'ACTIVE'
    if (!isActive) return
    if (email) managerEmails.push(email)
  })

  const tokens = await getTokensForEmails(managerEmails)
  if (!tokens.length) {
    await snap.ref.set({
      status: 'DONE',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      actorEmail,
      gymId,
      threshold: th,
      result: { managers: managerEmails.length, trainees: trainees.length, sent: 0 }
    }, { merge: true })
    return
  }

  const count = trainees.length
  const title = '잔여 PT 이용권 부족 알림'
  const body = `잔여 ${th}회 이하 회원이 ${count}명 있습니다.`

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: {
        type: 'MANAGER_LOW_CREDITS',
        gymId,
        threshold: String(th),
        count: String(count)
      }
    })

    await snap.ref.set({
      status: 'DONE',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      actorEmail,
      gymId,
      threshold: th,
      result: {
        managers: managerEmails.length,
        trainees: trainees.length,
        sentSuccess: response.successCount,
        sentFailure: response.failureCount
      }
    }, { merge: true })
  } catch (e) {
    console.error('[adminJobs] failed:', e)
    await snap.ref.set({
      status: 'FAILED',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      actorEmail,
      gymId,
      threshold: th,
      error: String((e as any)?.message || e)
    }, { merge: true })
  }
})
