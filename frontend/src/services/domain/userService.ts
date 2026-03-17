import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  orderBy
} from 'firebase/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth'
import { db } from '../../firebase/config'
import { writeAuditLog, type AuditPayload } from '../core/audit'
import {
  mapUsers,
  isTrainerLevel,
  demotePrimaryManagersToViceInGym,
  type AppUser
} from '../core/userUtils'
import type { ClientInfo, User, TicketHistoryEntry } from '../../types'
import type { DocumentData } from 'firebase/firestore'

export type ManagerType = 'PRIMARY' | 'VICE'

export interface CreateStaffPayload {
  email: string
  password: string
  name: string
  nickname?: string
  role: 'MANAGER' | 'SUB_MANAGER' | 'TRAINER'
  gymId?: string
  joinDate?: string
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED'
  registeredByEmail: string
}

export interface SearchUserResult {
  id: string
  data: Record<string, unknown>
}

export async function getClientsByTrainer(trainerEmail: string): Promise<ClientInfo[]> {
  const q = query(collection(db, 'users'), where('trainerEmail', '==', trainerEmail))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({
    uid: docSnap.id,
    email: docSnap.data().email,
    nickname: docSnap.data().nickname,
    remainingSessions: docSnap.data().remainingSessions,
    expirationDate: docSnap.data().expirationDate
  }))
}

export async function assignTrainerToClient(clientId: string, trainerEmail: string): Promise<void> {
  await updateDoc(doc(db, 'users', clientId), { trainerEmail })
}

export async function updateClientSession(
  clientId: string,
  updates: Pick<ClientInfo, 'remainingSessions' | 'expirationDate'>
): Promise<void> {
  await updateDoc(doc(db, 'users', clientId), updates)
}

export async function logTicketHistory(historyData: {
  memberUid: string
  action: string
  amountChanged: number
  newTotal: number
  newExpirationDate?: string
  courseId?: string
  registrantEmail?: string
}): Promise<void> {
  const userRef = doc(db, 'users', historyData.memberUid)
  const userSnap = await getDoc(userRef)
  if (!userSnap.exists()) throw new Error('User not found for ticket history')

  const userData = userSnap.data() as User

  await addDoc(collection(db, 'ticketHistory'), {
    memberUid: historyData.memberUid,
    action: historyData.action,
    amountChanged: historyData.amountChanged,
    remainingSessionsBefore: historyData.newTotal - historyData.amountChanged,
    remainingSessionsAfter: historyData.newTotal,
    newTotal: historyData.newTotal,
    newExpirationDate: historyData.newExpirationDate ?? userData.expirationDate ?? null,
    courseId: historyData.courseId ?? null,
    registrantEmail: historyData.registrantEmail ?? null,
    createdAt: serverTimestamp()
  })
}

export async function searchUserByEmail(email: string): Promise<SearchUserResult | null> {
  const q = query(collection(db, 'users'), where('email', '==', email))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : { id: snapshot.docs[0].id, data: snapshot.docs[0].data() }
}

export async function getTrainers(gymId?: string, includeDeleted = false): Promise<AppUser[]> {
  const q = gymId
    ? query(collection(db, 'users'), where('gymId', '==', gymId))
    : query(collection(db, 'users'), where('role', '==', 'TRAINER'))
  const snapshot = await getDocs(q)
  const loaded = mapUsers(snapshot).filter((u) => u.role === 'TRAINER' || (u.lvl as number) >= 10)
  if (includeDeleted) return loaded
  return loaded.filter((u) => u.deletedFlag !== true)
}

export async function updateTrainerRole(
  uid: string,
  role: string,
  lvl: number,
  gymId?: string,
  audit?: AuditPayload
): Promise<void> {
  const updates: Record<string, unknown> = { role, lvl }
  if (gymId) updates.gymId = gymId
  await updateDoc(doc(db, 'users', uid), updates)
  if (audit) await writeAuditLog(audit)
}

export async function updateTrainerInfo(
  uid: string,
  updates: { nickname?: string; gymId?: string }
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates)
}

export async function updateMemberProfile(
  uid: string,
  data: { name: string; phone?: string; gymId: string; nickname?: string }
): Promise<void> {
  const payload: Record<string, unknown> = {
    name: (data.name || '').trim(),
    gymId: data.gymId || null,
    profileComplete: true,
    updatedAt: serverTimestamp()
  }
  if (data.phone !== undefined) payload.phone = (data.phone || '').trim() || null
  if (data.nickname !== undefined) payload.nickname = (data.nickname || '').trim() || null
  await updateDoc(doc(db, 'users', uid), payload)
}

export async function setTrainerDeletedFlag(uid: string, deleted: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    deletedFlag: deleted,
    deletedAt: deleted ? serverTimestamp() : null
  })
}

export async function setTrainerDeletedFlagWithAudit(
  uid: string,
  deleted: boolean,
  audit: AuditPayload
): Promise<void> {
  await setTrainerDeletedFlag(uid, deleted)
  await writeAuditLog(audit)
}

export async function deleteTrainerCompletely(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid))
}

export async function deleteTrainerCompletelyWithAudit(uid: string, audit: AuditPayload): Promise<void> {
  await deleteTrainerCompletely(uid)
  await writeAuditLog(audit)
}

export async function getManagers(gymId?: string, includeDeleted = false): Promise<AppUser[]> {
  const q = gymId
    ? query(collection(db, 'users'), where('gymId', '==', gymId))
    : query(collection(db, 'users'), where('role', '==', 'MANAGER'))
  const snapshot = await getDocs(q)
  const loaded = mapUsers(snapshot).filter((u) => u.role === 'MANAGER')
  const gymFiltered = gymId ? loaded.filter((u) => u.gymId === gymId) : loaded
  if (includeDeleted) return gymFiltered
  return gymFiltered.filter((u) => u.deletedFlag !== true)
}

export async function getManagerCandidates(gymId: string): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), where('gymId', '==', gymId))
  const snapshot = await getDocs(q)
  return mapUsers(snapshot).filter((u) => isTrainerLevel(u) && u.deletedFlag !== true)
}

export async function assignManagerFromTrainer(
  uid: string,
  gymId: string,
  managerType: ManagerType
): Promise<void> {
  const targetRef = doc(db, 'users', uid)
  await runTransaction(db, async (transaction) => {
    const targetSnap = await transaction.get(targetRef)
    if (!targetSnap.exists()) throw new Error('Trainer not found')
    const target = targetSnap.data() as Record<string, unknown>
    if (!isTrainerLevel(target)) throw new Error('Target user is not trainer-level')
    if (target.deletedFlag === true) throw new Error('Deleted user cannot be assigned')
    if (managerType === 'PRIMARY') {
      await demotePrimaryManagersToViceInGym(transaction, gymId, uid)
    }
    transaction.update(targetRef, {
      role: 'MANAGER',
      lvl: 20,
      gymId,
      managerType,
      deletedFlag: false,
      deletedAt: null,
      updatedAt: serverTimestamp()
    })
  })
}

export async function assignManagerFromTrainerWithAudit(
  uid: string,
  gymId: string,
  managerType: ManagerType,
  audit: AuditPayload
): Promise<void> {
  await assignManagerFromTrainer(uid, gymId, managerType)
  await writeAuditLog(audit)
}

export async function updateManagerInfo(
  uid: string,
  updates: { nickname?: string; gymId?: string; managerType?: ManagerType }
): Promise<void> {
  const managerRef = doc(db, 'users', uid)
  await runTransaction(db, async (transaction) => {
    const managerSnap = await transaction.get(managerRef)
    if (!managerSnap.exists()) throw new Error('Manager not found')
    const manager = managerSnap.data() as Record<string, unknown>
    if (manager.role !== 'MANAGER') throw new Error('Target user is not manager')
    const nextGymId = (updates.gymId ?? manager.gymId) as string
    const nextManagerType = (updates.managerType ?? manager.managerType ?? 'VICE') as ManagerType
    if (!nextGymId) throw new Error('Gym is required')
    if (nextManagerType === 'PRIMARY') {
      await demotePrimaryManagersToViceInGym(transaction, nextGymId, uid)
    }
    const payload: Record<string, unknown> = {
      managerType: nextManagerType,
      gymId: nextGymId,
      updatedAt: serverTimestamp()
    }
    if (updates.nickname !== undefined) payload.nickname = updates.nickname
    transaction.update(managerRef, payload)
  })
}

export async function updateManagerInfoWithAudit(
  uid: string,
  updates: { nickname?: string; gymId?: string; managerType?: ManagerType },
  audit: AuditPayload
): Promise<void> {
  await updateManagerInfo(uid, updates)
  await writeAuditLog(audit)
}

export async function setManagerDeletedFlag(uid: string, deleted: boolean): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    deletedFlag: deleted,
    deletedAt: deleted ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  })
}

export async function setManagerDeletedFlagWithAudit(
  uid: string,
  deleted: boolean,
  audit: AuditPayload
): Promise<void> {
  await setManagerDeletedFlag(uid, deleted)
  await writeAuditLog(audit)
}

export async function deleteManagerCompletely(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid))
}

export async function deleteManagerCompletelyWithAudit(uid: string, audit: AuditPayload): Promise<void> {
  await deleteManagerCompletely(uid)
  await writeAuditLog(audit)
}

export async function demoteManagerToTrainer(uid: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role: 'TRAINER',
    lvl: 10,
    managerType: null,
    updatedAt: serverTimestamp()
  })
}

export async function demoteManagerToTrainerWithAudit(uid: string, audit: AuditPayload): Promise<void> {
  await demoteManagerToTrainer(uid)
  await writeAuditLog(audit)
}

export async function getStaffs(): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', ['MANAGER', 'SUB_MANAGER', 'TRAINER'])
  )
  const snapshot = await getDocs(q)
  return mapUsers(snapshot) as unknown as User[]
}

export async function updateStaffData(
  uid: string,
  updates: Partial<User>,
  audit?: AuditPayload
): Promise<void> {
  const staffRef = doc(db, 'users', uid)
  await updateDoc(staffRef, {
    ...updates,
    updatedAt: serverTimestamp()
  })
  if (audit) await writeAuditLog(audit)
}

export async function createStaffAccount(payload: CreateStaffPayload): Promise<string> {
  const secondaryApp = initializeApp(
    {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    },
    `secondary-${Date.now()}`
  )
  const secondaryAuth = getAuth(secondaryApp)
  let newUid = ''
  try {
    const lvl = payload.role === 'MANAGER' ? 20 : payload.role === 'SUB_MANAGER' ? 15 : 10
    const credential = await createUserWithEmailAndPassword(secondaryAuth, payload.email, payload.password)
    newUid = credential.user.uid
    await firebaseSignOut(secondaryAuth)
    await setDoc(doc(db, 'users', newUid), {
      email: payload.email,
      name: payload.name,
      nickname: payload.nickname || '',
      role: payload.role,
      lvl,
      gymId: payload.gymId || null,
      joinDate: payload.joinDate || null,
      employmentStatus: payload.employmentStatus,
      registeredByEmail: payload.registeredByEmail,
      registeredAt: serverTimestamp(),
      mustChangePassword: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })
    await writeAuditLog({
      actorEmail: payload.registeredByEmail,
      action: 'CREATE_STAFF_ACCOUNT',
      targetUid: newUid,
      targetEmail: payload.email,
      metadata: { role: payload.role, gymId: payload.gymId || null }
    })
    return newUid
  } catch (err) {
    if (newUid) {
      console.warn('Orphaned Firebase Auth account may exist for uid:', newUid)
    }
    throw err
  } finally {
    try {
      await deleteApp(secondaryApp)
    } catch {
      // ignore
    }
  }
}

export async function addTicketCredit(
  memberUid: string,
  payload: {
    amount: number
    purchaseDate: string
    expirationDate: string
    registrantEmail: string
  }
): Promise<void> {
  const userRef = doc(db, 'users', memberUid)
  const historyRef = collection(db, 'ticketHistory')

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef)
    if (!userSnap.exists()) throw new Error('User not found')

    const userData = userSnap.data() as User
    const currentSessions = userData.remainingSessions || 0
    const newSessions = currentSessions + payload.amount

    // 1. Update User
    transaction.update(userRef, {
      remainingSessions: newSessions,
      expirationDate: payload.expirationDate,
      updatedAt: serverTimestamp()
    })

    // 2. Log History — use clientEmail for backward compat with existing records
    const historyEntry = {
      memberUid,
      clientEmail: userData.email,
      memberEmail: userData.email,
      action: 'ADD',
      amount: payload.amount,
      amountChanged: payload.amount,
      remainingSessionsBefore: currentSessions,
      remainingSessionsAfter: newSessions,
      newTotal: newSessions,
      purchaseDate: payload.purchaseDate,
      expirationDate: payload.expirationDate,
      newExpirationDate: payload.expirationDate,
      registrantEmail: payload.registrantEmail,
      trainerEmail: payload.registrantEmail,
      createdAt: serverTimestamp()
    }
    const newHistoryDocRef = doc(historyRef)
    transaction.set(newHistoryDocRef, historyEntry)
  })
}

export async function getTicketHistory(memberUid: string): Promise<TicketHistoryEntry[]> {
  const q = query(
    collection(db, 'ticketHistory'),
    where('memberUid', '==', memberUid)
  )
  const snapshot = await getDocs(q)

  const results: TicketHistoryEntry[] = snapshot.docs.map((docSnap) => {
    const data = docSnap.data()

    return {
      id: docSnap.id,
      memberUid: data.memberUid || '',
      action: data.action || 'ADD',
      amount: data.amountChanged ?? data.amount ?? 0,
      remainingSessionsBefore: data.remainingSessionsBefore ?? 0,
      remainingSessionsAfter: data.newTotal ?? data.remainingSessionsAfter ?? 0,
      purchaseDate: data.purchaseDate || '',
      expirationDate: data.expirationDate || data.newExpirationDate || '',
      registrantEmail: data.registrantEmail || data.trainerEmail || '',
      createdAt: data.createdAt
    } as TicketHistoryEntry
  })

  // Sort by createdAt descending
  results.sort((a, b) => {
    const getTime = (ts: any): number => {
      if (!ts) return 0
      if (typeof ts.toMillis === 'function') return ts.toMillis()
      if (ts.seconds) return ts.seconds * 1000
      return 0
    }
    return getTime(b.createdAt) - getTime(a.createdAt)
  })

  return results
}


