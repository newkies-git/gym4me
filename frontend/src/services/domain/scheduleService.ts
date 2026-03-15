import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { assertCanAccessUserData, assertCanAccessClassData, isSiteAdminActor, type AccessActor } from '../core/access'
import { chunkByTen } from '../core/utils'
import type { CalendarEvent, ExerciseRecord } from '../../types'
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'

function mapSnapshotToEvent(docSnap: QueryDocumentSnapshot<DocumentData>): CalendarEvent {
  const data = docSnap.data()
  return {
    id: docSnap.id,
    title: data.title,
    dateStr: data.date,
    time: data.time,
    type: data.type,
    targetType: data.targetType || 'INDIVIDUAL',
    status: data.status,
    clientEmail: data.clientEmail,
    classId: data.classId,
    trainerEmail: data.trainerEmail,
    notes: data.notes,
    rejectionReason: data.rejectionReason,
    mediaUrl: data.mediaUrl,
    signatureUrl: data.signatureUrl,
    completedAt: data.completedAt,
    records: data.records || []
  }
}

export async function getSchedules(targetEmail: string, actor: AccessActor): Promise<CalendarEvent[]> {
  await assertCanAccessUserData(targetEmail, actor)

  const qIndividual = query(
    collection(db, 'schedules'),
    where('clientEmail', '==', targetEmail),
    where('targetType', '==', 'INDIVIDUAL')
  )
  const qPersonal = query(
    collection(db, 'schedules'),
    where('userEmail', '==', targetEmail),
    where('targetType', '==', 'INDIVIDUAL')
  )
  const qClasses = query(
    collection(db, 'classes'),
    where('traineeEmails', 'array-contains', targetEmail)
  )
  const classSnap = await getDocs(qClasses)
  const classIds = classSnap.docs.map((d) => d.id)

  const classSchedules: CalendarEvent[] = []
  if (classIds.length > 0) {
    const classIdChunks = chunkByTen(classIds)
    for (const classIdChunk of classIdChunks) {
      const qClassSchedules = query(
        collection(db, 'schedules'),
        where('classId', 'in', classIdChunk)
      )
      const classSchedSnap = await getDocs(qClassSchedules)
      classSchedules.push(...classSchedSnap.docs.map((d) => mapSnapshotToEvent(d)))
    }
  }

  const [indivSnap, persSnap] = await Promise.all([getDocs(qIndividual), getDocs(qPersonal)])
  const individualSchedules = indivSnap.docs.map((d) => mapSnapshotToEvent(d))
  const personalSchedules = persSnap.docs.map((d) => mapSnapshotToEvent(d))
  const all = [...individualSchedules, ...personalSchedules, ...classSchedules]
  const unique = Array.from(new Map(all.map((item) => [item.id, item])).values())
  return [...unique]
}

export async function getSchedulesByClass(classId: string, actor: AccessActor): Promise<CalendarEvent[]> {
  await assertCanAccessClassData(classId, actor)
  const q = query(collection(db, 'schedules'), where('classId', '==', classId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => mapSnapshotToEvent(d))
}

export async function addSchedule(scheduleData: Partial<CalendarEvent>) {
  return await addDoc(collection(db, 'schedules'), {
    ...scheduleData,
    createdAt: serverTimestamp()
  })
}

export async function updateSchedule(id: string, updates: Record<string, unknown>) {
  return await updateDoc(doc(db, 'schedules', id), updates)
}

export async function appendClassWorkoutLog(event: CalendarEvent, records: ExerciseRecord[]): Promise<void> {
  if (!event.classId) throw new Error('Class event is required')
  const classSnap = await getDoc(doc(db, 'classes', event.classId))
  if (!classSnap.exists()) throw new Error('Class not found')
  const traineeEmails: string[] = classSnap.data().traineeEmails || []
  if (traineeEmails.length === 0) return
  const jobs = traineeEmails.map((email) =>
    addDoc(collection(db, 'workoutLogs'), {
      userEmail: email,
      classId: event.classId,
      scheduleId: event.id,
      title: event.title,
      date: event.dateStr,
      records,
      source: 'CLASS_BULK',
      createdAt: serverTimestamp()
    })
  )
  await Promise.all(jobs)
}

export async function completeSession(eventId: string, signatureUrl: string, actor: AccessActor): Promise<void> {
  const eventRef = doc(db, 'schedules', eventId)
  const eventSnap = await getDoc(eventRef)
  if (!eventSnap.exists()) throw new Error('Event not found')
  const eventData = eventSnap.data() as CalendarEvent & { date?: string }
  if (!isSiteAdminActor(actor) && actor.email !== eventData.trainerEmail) {
    throw new Error('Forbidden')
  }

  const emailsToDeduct: string[] = []
  if (eventData.type === 'PT') {
    if (eventData.targetType === 'CLASS' && eventData.classId) {
      const classSnap = await getDoc(doc(db, 'classes', eventData.classId))
      if (classSnap.exists()) {
        emailsToDeduct.push(...(classSnap.data().traineeEmails || []))
      }
    } else if (eventData.clientEmail) {
      emailsToDeduct.push(eventData.clientEmail)
    }
  }

  const uidsToDeduct: string[] = []
  if (emailsToDeduct.length > 0) {
    const emailChunks = chunkByTen(emailsToDeduct)
    for (const emailChunk of emailChunks) {
      const usersQ = query(collection(db, 'users'), where('email', 'in', emailChunk))
      const usersSnap = await getDocs(usersQ)
      usersSnap.docs.forEach((d) => uidsToDeduct.push(d.id))
    }
  }

  await runTransaction(db, async (transaction) => {
    const currentEventSnap = await transaction.get(eventRef)
    if (!currentEventSnap.exists()) throw new Error('Event not found')
    if (currentEventSnap.data().status === 'COMPLETED') throw new Error('Already completed')

    const userSnaps = []
    for (const uid of uidsToDeduct) {
      userSnaps.push(await transaction.get(doc(db, 'users', uid)))
    }

    transaction.update(eventRef, {
      status: 'COMPLETED',
      signatureUrl,
      completedAt: serverTimestamp()
    })

    for (const userSnap of userSnaps) {
      if (userSnap.exists()) {
        const userData = userSnap.data()
        const currentSessions = userData.remainingSessions || 0
        if (currentSessions > 0) {
          transaction.update(userSnap.ref, {
            remainingSessions: currentSessions - 1
          })
          const historyRef = doc(collection(db, 'ticketHistory'))
          transaction.set(historyRef, {
            clientEmail: userData.email,
            trainerEmail: eventData.trainerEmail,
            action: 'DEDUCT',
            amountChanged: -1,
            remainingSessions: currentSessions - 1,
            reason: `PT Session Completed: ${eventData.title}`,
            createdAt: serverTimestamp()
          })
        }
      }
    }
  })
}
