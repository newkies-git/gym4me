import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'

export interface AuditPayload {
  actorEmail: string
  action: string
  targetUid?: string
  targetEmail?: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(payload: AuditPayload): Promise<void> {
  if (!payload.actorEmail) return
  await addDoc(collection(db, 'adminAuditLogs'), {
    actorEmail: payload.actorEmail,
    action: payload.action,
    targetUid: payload.targetUid ?? null,
    targetEmail: payload.targetEmail ?? null,
    metadata: payload.metadata ?? {},
    createdAt: serverTimestamp()
  })
}
