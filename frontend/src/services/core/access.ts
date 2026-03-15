import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import type { User } from '../../types'

export type AccessActor = Pick<User, 'email' | 'lvl' | 'role'>

export function isSiteAdminActor(actor: AccessActor): boolean {
  return (actor.lvl || 0) >= 100 || actor.role === 'SITE_ADMIN'
}

export async function assertCanAccessUserData(targetEmail: string, actor: AccessActor): Promise<void> {
  if (actor.email === targetEmail || isSiteAdminActor(actor)) return

  const isTrainer = (actor.lvl || 0) >= 10
  if (!isTrainer) throw new Error('Forbidden')

  const q = query(collection(db, 'users'), where('email', '==', targetEmail))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('Target user not found')

  const targetUser = snap.docs[0].data()
  if (targetUser.trainerEmail !== actor.email) {
    throw new Error('Forbidden')
  }
}

export async function assertCanAccessClassData(classId: string, actor: AccessActor): Promise<void> {
  if (isSiteAdminActor(actor)) return

  const classSnap = await getDoc(doc(db, 'classes', classId))
  if (!classSnap.exists()) throw new Error('Class not found')

  const classData = classSnap.data()
  const traineeEmails: string[] = classData.traineeEmails || []
  const isOwnerTrainer = classData.trainerEmail === actor.email
  const isMember = traineeEmails.includes(actor.email)

  if (!isOwnerTrainer && !isMember) {
    throw new Error('Forbidden')
  }
}
