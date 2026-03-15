import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import type { GymClass } from '../../types'

export async function createClass(classData: Omit<GymClass, 'id'>) {
  const data = { ...classData } as Record<string, unknown>
  if (data.gymId === undefined) delete data.gymId
  return await addDoc(collection(db, 'classes'), {
    ...data,
    createdAt: serverTimestamp()
  })
}

export async function getClassesByTrainer(trainerEmail: string): Promise<GymClass[]> {
  const q = query(collection(db, 'classes'), where('trainerEmail', '==', trainerEmail))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as GymClass))
}

export async function addTraineeToClass(classId: string, traineeEmail: string): Promise<void> {
  const classRef = doc(db, 'classes', classId)
  const classSnap = await getDoc(classRef)
  if (!classSnap.exists()) throw new Error('Class not found')
  const traineeEmails: string[] = classSnap.data().traineeEmails || []
  if (traineeEmails.includes(traineeEmail)) return
  await updateDoc(classRef, {
    traineeEmails: [...traineeEmails, traineeEmail]
  })
}

export async function removeTraineeFromClass(classId: string, traineeEmail: string): Promise<void> {
  const classRef = doc(db, 'classes', classId)
  const classSnap = await getDoc(classRef)
  if (!classSnap.exists()) throw new Error('Class not found')
  const traineeEmails: string[] = classSnap.data().traineeEmails || []
  if (!traineeEmails.includes(traineeEmail)) return
  await updateDoc(classRef, {
    traineeEmails: traineeEmails.filter((email: string) => email !== traineeEmail)
  })
}
