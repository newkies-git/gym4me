export interface ToolMediaItem {
  url: string
  type: 'VIDEO' | 'IMAGE'
}

export interface ToolUsage {
  id: string
  title: string
  description: string
  mediaUrl?: string
  mediaType?: 'VIDEO' | 'IMAGE'
  media?: ToolMediaItem[]
  category: string
  trainerEmail: string
  trainerNickname?: string
  isPrivate: boolean
  targetTraineeEmail?: string
  createdAt: unknown
}
