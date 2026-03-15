import { collection, query, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import type { QuerySnapshot, QueryDocumentSnapshot, Transaction } from 'firebase/firestore'
import type { DocumentData } from 'firebase/firestore'
import { db } from '../../firebase/config'

/** Transaction.get(Query) returns QuerySnapshot; Firestore supports it but TS typings only declare DocumentReference. */
function getQueryInTransaction(transaction: Transaction, q: ReturnType<typeof query>): Promise<QuerySnapshot<DocumentData>> {
  return transaction.get(q as never) as unknown as Promise<QuerySnapshot<DocumentData>>
}

export interface AppUser {
  uid: string
  [key: string]: unknown
}

export function mapUsers(snapshot: QuerySnapshot<DocumentData>): AppUser[] {
  return snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ uid: d.id, ...d.data() } as AppUser))
}

export function isTrainerLevel(user: Record<string, unknown>): boolean {
  const role = user.role as string | undefined
  const lvl = (user.lvl as number) ?? 0
  return role === 'TRAINER' || role === 'MANAGER' || lvl >= 10
}

export function isActivePrimaryManager(user: Record<string, unknown>): boolean {
  return (user.role as string) === 'MANAGER' && (user.managerType as string) === 'PRIMARY' && user.deletedFlag !== true
}

export async function demotePrimaryManagersToViceInGym(
  transaction: Transaction,
  gymId: string,
  exceptUid?: string
): Promise<void> {
  const sameGymSnap = await getQueryInTransaction(
    transaction,
    query(collection(db, 'users'), where('gymId', '==', gymId))
  )
  mapUsers(sameGymSnap).forEach((user) => {
    if (user.uid === exceptUid) return
    if (!isActivePrimaryManager(user)) return
    transaction.update(doc(db, 'users', user.uid), {
      managerType: 'VICE',
      updatedAt: serverTimestamp()
    })
  })
}
