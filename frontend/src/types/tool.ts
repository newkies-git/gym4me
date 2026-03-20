export interface ToolMediaItem {
  url: string
  type: 'VIDEO' | 'IMAGE'
  /** optional: duration in seconds (when known/stored) */
  durationSec?: number
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
  /** optional: number of views */
  viewsCount?: number
  /** optional: number of comments */
  commentsCount?: number
}

export interface ToolComment {
  id: string
  content: string
  authorEmail: string
  authorNickname?: string
  createdAt: unknown
}
