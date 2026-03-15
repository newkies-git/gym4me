export interface Course {
  id: string
  title: string
  trainerEmail: string
  trainerNickname?: string
  gymId?: string
  dateStr: string
  timeFrom: string
  timeTo: string
  type: '1:1' | '1:2' | '1:n'
  maxParticipants?: number
  content: string
  traineeEmails: string[]
  applicationEmails: string[]
  createdBy: string
  createdByName?: string
  createdAt: unknown
}
