export interface ExerciseRecord {
  name: string
  sets: number
  reps: number
  weight?: number
}

export interface GymClass {
  id: string
  name: string
  trainerEmail: string
  traineeEmails: string[]
  gymId?: string
  createdAt: unknown
}

export interface CalendarEvent {
  id: string
  title: string
  dateStr: string
  time: string
  type: 'PT' | 'PERSONAL'
  targetType: 'INDIVIDUAL' | 'CLASS'
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
  clientEmail?: string
  classId?: string
  trainerEmail?: string
  notes?: string
  rejectionReason?: string
  mediaUrl?: string
  signatureUrl?: string
  completedAt?: unknown
  records?: ExerciseRecord[]
}
