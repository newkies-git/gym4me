/**
 * 도메인별 타입 re-export.
 * 기존 import from '../types' 호환 유지.
 */
export type {
  ExerciseRecord,
  GymClass,
  CalendarEvent
} from './schedule'

export type { User, ClientInfo } from './user'
export type { Gym } from './gym'
export type { BodyRecord, ProfileHistory } from './profile'
export type { TrainerProfile } from './trainer'
export type { ToolMediaItem, ToolUsage } from './tool'
export type { Course } from './course'
