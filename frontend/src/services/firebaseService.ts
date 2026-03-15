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
  getGymMembers,
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
  getClientsByTrainer,
  assignTrainerToClient,
  updateClientSession,
  logTicketHistory,
  searchUserByEmail,
  getTrainers,
  updateTrainerRole,
  updateTrainerInfo,
  updateMemberProfile,
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
  type ManagerType,
  type CreateStaffPayload
} from './domain/userService'

export type { AccessActor } from './core/access'
export type { AuditPayload } from './core/audit'
