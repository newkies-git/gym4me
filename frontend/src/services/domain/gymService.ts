import { collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import type { Gym, ClientInfo } from '../../types'

export async function getGyms(): Promise<Gym[]> {
  const snapshot = await getDocs(collection(db, 'gyms'))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Gym))
}

export async function getGymById(id: string): Promise<Gym | null> {
  const snap = await getDoc(doc(db, 'gyms', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Gym
}

export async function createGym(gymData: Partial<Gym>) {
  const docRef = await addDoc(collection(db, 'gyms'), {
    ...gymData,
    createdAt: serverTimestamp()
  })
  if (gymData.managerEmail) {
    const q = query(collection(db, 'users'), where('email', '==', gymData.managerEmail))
    const snap = await getDocs(q)
    if (!snap.empty) {
      await updateDoc(doc(db, 'users', snap.docs[0].id), {
        gymId: docRef.id,
        role: 'MANAGER',
        lvl: 20
      })
    }
  }
  return docRef
}

export async function updateGym(id: string, updates: Partial<Gym>): Promise<void> {
  await updateDoc(doc(db, 'gyms', id), updates)
}

export async function deleteGym(id: string): Promise<void> {
  await deleteDoc(doc(db, 'gyms', id))
}

export async function getGymMembers(gymId: string): Promise<ClientInfo[]> {
  const q = query(
    collection(db, 'users'),
    where('gymId', '==', gymId),
    where('lvl', '==', 5)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({
    uid: docSnap.id,
    email: docSnap.data().email,
    nickname: docSnap.data().nickname,
    remainingSessions: docSnap.data().remainingSessions,
    expirationDate: docSnap.data().expirationDate
  }))
}

export async function getGymTraineesAndObservers(gymId: string): Promise<ClientInfo[]> {
  const q = query(
    collection(db, 'users'),
    where('gymId', '==', gymId),
    where('lvl', 'in', [1, 5])
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({
    uid: docSnap.id,
    email: docSnap.data().email,
    nickname: docSnap.data().nickname,
    remainingSessions: docSnap.data().remainingSessions,
    expirationDate: docSnap.data().expirationDate
  }))
}
