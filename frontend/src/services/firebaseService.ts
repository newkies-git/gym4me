/**
 * Re-export barrel for backward compatibility.
 * Implementations: domain/scheduleService, domain/gymService, domain/profileService,
 * domain/classService, domain/userService, core/access, core/audit.
 */
export {
  getSchedules,
  getSchedulesByClass,
  addSchedule,
  updateSchedule,
  completeSession,
  appendClassWorkoutLog
} from './domain/scheduleService'

export {
  getGyms,
  getGymById,
  createGym,
  updateGym,
  deleteGym,
  getGymTrainees,
  getGymTraineesAndObservers
} from './domain/gymService'

export {
  getTrainerProfile,
  updateTrainerProfile,
  getProfileHistory,
  getBodyProfiles,
  addBodyProfile
} from './domain/profileService'

export {
  createClass,
  getClassesByTrainer,
  addTraineeToClass,
  removeTraineeFromClass
} from './domain/classService'

export {
  getTraineesByTrainer,
  assignTrainerToTrainee,
  updateTraineeSession,
  logTicketHistory,
  searchUserByEmail,
  getTrainers,
  updateTrainerRole,
  updateTrainerInfo,
  updateTraineeProfile,
  setTrainerDeletedFlag,
  setTrainerDeletedFlagWithAudit,
  deleteTrainerCompletely,
  deleteTrainerCompletelyWithAudit,
  getManagers,
  getManagerCandidates,
  assignManagerFromTrainer,
  assignManagerFromTrainerWithAudit,
  updateManagerInfo,
  updateManagerInfoWithAudit,
  setManagerDeletedFlag,
  setManagerDeletedFlagWithAudit,
  deleteManagerCompletely,
  deleteManagerCompletelyWithAudit,
  demoteManagerToTrainer,
  demoteManagerToTrainerWithAudit,
  getStaffs,
  updateStaffData,
  createStaffAccount,
  createSupervisorAccount,
  addTicketCredit,
  getTicketHistory,
  type ManagerType,
  type CreateStaffPayload,
  type CreateSupervisorPayload
} from './domain/userService'

export type { AccessActor } from './core/access'
export type { AuditPayload } from './core/audit'
