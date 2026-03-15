import { doc, getDoc, setDoc, addDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { assertCanAccessUserData } from '../core/access'
import type { AccessActor } from '../core/access'
import type { BodyRecord, TrainerProfile, ProfileHistory } from '../../types'

export async function getTrainerProfile(email: string): Promise<TrainerProfile | null> {
  const docRef = doc(db, 'trainerProfiles', email)
  const snap = await getDoc(docRef)
  if (!snap.exists()) return null
  return { uid: snap.data().uid, email, ...snap.data() } as TrainerProfile
}

export async function updateTrainerProfile(
  email: string,
  profile: Partial<TrainerProfile>,
  before: Partial<TrainerProfile> = {}
): Promise<void> {
  const docRef = doc(db, 'trainerProfiles', email)
  await setDoc(
    docRef,
    {
      ...profile,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  )
  await addDoc(collection(db, 'profileHistory'), {
    trainerEmail: email,
    before,
    after: profile,
    updatedAt: serverTimestamp()
  })
}

export async function getProfileHistory(email: string): Promise<ProfileHistory[]> {
  const q = query(collection(db, 'profileHistory'), where('trainerEmail', '==', email))
  const snapshot = await getDocs(q)
  const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ProfileHistory))
  const toMillis = (v: unknown): number =>
    typeof v === 'object' && v !== null && typeof (v as { toMillis?: () => number }).toMillis === 'function'
      ? (v as { toMillis: () => number }).toMillis()
      : 0
  return logs.sort((a, b) => toMillis(b.updatedAt) - toMillis(a.updatedAt))
}

export async function getBodyProfiles(targetEmail: string, actor: AccessActor): Promise<BodyRecord[]> {
  await assertCanAccessUserData(targetEmail, actor)
  const q = query(collection(db, 'bodyProfiles'), where('userEmail', '==', targetEmail))
  const snapshot = await getDocs(q)
  const loaded = snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<BodyRecord, 'id'>)
  }))
  loaded.sort((a, b) => a.date.localeCompare(b.date))
  return loaded
}

export async function addBodyProfile(
  targetEmail: string,
  data: Partial<BodyRecord>,
  actor: AccessActor
) {
  await assertCanAccessUserData(targetEmail, actor)
  return await addDoc(collection(db, 'bodyProfiles'), {
    userEmail: targetEmail,
    date: data.date,
    weight: data.weight,
    bodyFat: data.bodyFat ?? null,
    muscleMass: data.muscleMass ?? null,
    createdAt: serverTimestamp()
  })
}
