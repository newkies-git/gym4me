import type { TrainerProfile } from './trainer'

export interface BodyRecord {
  id: string
  date: string
  weight: number
  bodyFat?: number
  muscleMass?: number
}

export interface ProfileHistory {
  id: string
  trainerEmail: string
  before: Partial<TrainerProfile>
  after: Partial<TrainerProfile>
  updatedAt: unknown
}
