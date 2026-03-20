export interface User {
  uid: string
  email: string
  nickname?: string
  name?: string
  phone?: string
  profileImageUrl?: string
  lvl: number
  role: string
  gymId?: string
  managerType?: 'PRIMARY' | 'VICE'
  remainingSessions?: number
  expirationDate?: string
  mustChangePassword?: boolean
  profileComplete?: boolean
  joinDate?: string
  leaveDate?: string
  employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED'
  registeredByEmail?: string
  registeredAt?: unknown
}

export interface TraineeInfo {
  uid: string
  email: string
  nickname?: string
  profileImageUrl?: string
  remainingSessions?: number
  expirationDate?: string
  gymId?: string
}
