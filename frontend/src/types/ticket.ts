export type TicketAction = 'ADD' | 'USE' | 'REDUCE' | 'EXPIRE'

export interface TicketHistoryEntry {
  id?: string
  memberUid: string
  action: TicketAction
  amount: number // positive for ADD, negative/positive depending on logic for USE/REDUCE
  remainingSessionsBefore: number
  remainingSessionsAfter: number
  purchaseDate?: string
  expirationDate?: string
  note?: string
  registrantEmail: string
  createdAt: any // Firestore Timestamp
}
