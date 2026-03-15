import { db } from '../firebase/config'
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  where
} from 'firebase/firestore'
import type { Course } from '../types'

function toCourse(id: string, data: Record<string, unknown>): Course {
  return {
    id,
    title: (data.title as string) ?? '',
    trainerEmail: (data.trainerEmail as string) ?? '',
    trainerNickname: data.trainerNickname as string | undefined,
    gymId: data.gymId as string | undefined,
    dateStr: (data.dateStr as string) ?? '',
    timeFrom: (data.timeFrom as string) ?? '',
    timeTo: (data.timeTo as string) ?? '',
    type: (data.type as Course['type']) ?? '1:1',
    maxParticipants: data.maxParticipants as number | undefined,
    content: (data.content as string) ?? '',
    traineeEmails: Array.isArray(data.traineeEmails) ? (data.traineeEmails as string[]) : [],
    applicationEmails: Array.isArray(data.applicationEmails) ? (data.applicationEmails as string[]) : [],
    createdBy: (data.createdBy as string) ?? '',
    createdByName: data.createdByName as string | undefined,
    createdAt: data.createdAt
  }
}

/** 모든 강좌 목록 조회 (로그인 사용자) */
export async function getCourses(): Promise<Course[]> {
  const q = query(collection(db, 'courses'))
  const snap = await getDocs(q)
  const list = snap.docs.map((d) => toCourse(d.id, d.data() as Record<string, unknown>))
  list.sort((a, b) => {
    const da = a.dateStr + a.timeFrom
    const db_ = b.dateStr + b.timeFrom
    return da.localeCompare(db_)
  })
  return list
}

/** 특정 사용자(강사 또는 수강자) 기준 강좌 목록 — 캘린더 병합용 */
export async function getCoursesForUser(userEmail: string): Promise<Course[]> {
  const [asTrainerSnap, asTraineeSnap] = await Promise.all([
    getDocs(query(collection(db, 'courses'), where('trainerEmail', '==', userEmail))),
    getDocs(query(collection(db, 'courses'), where('traineeEmails', 'array-contains', userEmail)))
  ])
  const byId = new Map<string, Course>()
  asTrainerSnap.docs.forEach((d) => {
    const c = toCourse(d.id, d.data() as Record<string, unknown>)
    byId.set(c.id, c)
  })
  asTraineeSnap.docs.forEach((d) => {
    const c = toCourse(d.id, d.data() as Record<string, unknown>)
    byId.set(c.id, c)
  })
  const list = Array.from(byId.values())
  list.sort((a, b) => {
    const da = a.dateStr + a.timeFrom
    const db_ = b.dateStr + b.timeFrom
    return da.localeCompare(db_)
  })
  return list
}

/** 강좌 생성 (trainer 이상) */
export async function createCourse(data: Omit<Course, 'id' | 'createdAt'>): Promise<string> {
  const payload: Record<string, unknown> = {
    title: data.title.trim(),
    trainerEmail: data.trainerEmail,
    trainerNickname: data.trainerNickname ?? '',
    dateStr: data.dateStr,
    timeFrom: data.timeFrom,
    timeTo: data.timeTo,
    type: data.type,
    maxParticipants: data.maxParticipants ?? null,
    content: (data.content || '').trim(),
    traineeEmails: data.traineeEmails ?? [],
    applicationEmails: data.applicationEmails ?? [],
    createdBy: data.createdBy,
    createdByName: data.createdByName ?? '',
    createdAt: serverTimestamp()
  }
  if (data.gymId) payload.gymId = data.gymId
  const ref = await addDoc(collection(db, 'courses'), payload)
  return ref.id
}

/** 강좌 수정 (trainer 이상, 본인 강좌 또는 관리자) */
export async function updateCourse(
  id: string,
  updates: Partial<Pick<Course, 'title' | 'gymId' | 'dateStr' | 'timeFrom' | 'timeTo' | 'type' | 'maxParticipants' | 'content' | 'traineeEmails'>>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() }
  if (updates.title !== undefined) payload.title = updates.title.trim()
  if (updates.gymId !== undefined) payload.gymId = updates.gymId || null
  if (updates.dateStr !== undefined) payload.dateStr = updates.dateStr
  if (updates.timeFrom !== undefined) payload.timeFrom = updates.timeFrom
  if (updates.timeTo !== undefined) payload.timeTo = updates.timeTo
  if (updates.type !== undefined) payload.type = updates.type
  if (updates.maxParticipants !== undefined) payload.maxParticipants = updates.maxParticipants ?? null
  if (updates.content !== undefined) payload.content = updates.content.trim()
  if (updates.traineeEmails !== undefined) payload.traineeEmails = updates.traineeEmails
  await updateDoc(doc(db, 'courses', id), payload)
}

/** 강좌 삭제 (trainer 이상) */
export async function deleteCourse(id: string): Promise<void> {
  await deleteDoc(doc(db, 'courses', id))
}

/** 참석 신청 (trainee: courseApplications에 문서 추가) */
export async function applyToCourse(courseId: string, traineeEmail: string): Promise<void> {
  const existing = await getDocs(
    query(
      collection(db, 'courseApplications'),
      where('courseId', '==', courseId),
      where('traineeEmail', '==', traineeEmail)
    )
  )
  if (!existing.empty) throw new Error('Already applied')
  await addDoc(collection(db, 'courseApplications'), {
    courseId,
    traineeEmail,
    createdAt: serverTimestamp()
  })
}

/** 참석 신청 취소 */
export async function cancelApplication(courseId: string, traineeEmail: string): Promise<void> {
  const q = query(
    collection(db, 'courseApplications'),
    where('courseId', '==', courseId),
    where('traineeEmail', '==', traineeEmail)
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'courseApplications', d.id))
  }
}

export interface CourseApplication {
  id: string
  courseId: string
  traineeEmail: string
  createdAt: unknown
}

/** 강좌별 참석 신청 목록 (trainer용) */
export async function getCourseApplications(courseId: string): Promise<CourseApplication[]> {
  const q = query(
    collection(db, 'courseApplications'),
    where('courseId', '==', courseId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({
    id: d.id,
    courseId: (d.data().courseId as string) ?? '',
    traineeEmail: (d.data().traineeEmail as string) ?? '',
    createdAt: d.data().createdAt
  }))
}

/** 참석 신청 승인: traineeEmails에 추가 후 application 문서 삭제 */
export async function approveApplication(
  courseId: string,
  applicationId: string,
  traineeEmail: string
): Promise<void> {
  const courseRef = doc(db, 'courses', courseId)
  const courseSnap = await getDoc(courseRef)
  if (!courseSnap.exists()) throw new Error('Course not found')
  const data = courseSnap.data()
  const traineeEmails: string[] = Array.isArray(data.traineeEmails) ? [...data.traineeEmails] : []
  if (!traineeEmails.includes(traineeEmail)) traineeEmails.push(traineeEmail)
  await updateDoc(courseRef, { traineeEmails, updatedAt: serverTimestamp() })
  await deleteDoc(doc(db, 'courseApplications', applicationId))
}
