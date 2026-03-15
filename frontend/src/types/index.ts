export interface User {
  uid: string;
  email: string;
  nickname?: string;
  name?: string;
  phone?: string;
  profileImageUrl?: string;
  lvl: number;
  role: string;
  gymId?: string;
  managerType?: 'PRIMARY' | 'VICE';
  remainingSessions?: number;
  expirationDate?: string;
  mustChangePassword?: boolean;
  /** 회원(Member/Observer) 첫 로그인 시 추가 정보 입력 완료 여부 */
  profileComplete?: boolean;

  // Staff Details
  joinDate?: string;
  leaveDate?: string;
  employmentStatus?: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
  registeredByEmail?: string;
  registeredAt?: any;
}

export interface Gym {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  openDate?: string;
  notes?: string;
  managerEmail: string;
  createdAt: any;
}

export interface ClientInfo {
  uid: string;
  email: string;
  nickname?: string;
  remainingSessions?: number;
  expirationDate?: string;
}

export interface ExerciseRecord {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface GymClass {
  id: string;
  name: string;
  trainerEmail: string;
  traineeEmails: string[];
  gymId?: string;
  createdAt: any;
}

export interface CalendarEvent {
  id: string;
  title: string;
  dateStr: string;
  time: string;
  type: 'PT' | 'PERSONAL';
  targetType: 'INDIVIDUAL' | 'CLASS';
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  clientEmail?: string; // INDIVIDUAL 인 경우
  classId?: string;     // CLASS 인 경우
  trainerEmail?: string;
  notes?: string;
  rejectionReason?: string;
  mediaUrl?: string;
  signatureUrl?: string;
  completedAt?: any;
  records?: ExerciseRecord[];
}

export interface BodyRecord {
  id: string;
  date: string;
  weight: number;
  bodyFat?: number;
  muscleMass?: number;
}

export interface TrainerProfile {
  uid: string;
  email: string;
  nickname: string;
  bio?: string;
  specialties?: string[];
  photoUrl?: string;
  awards?: string[];
  career?: string[];
  updatedAt: any;
}

export interface ProfileHistory {
  id: string;
  trainerEmail: string;
  before: Partial<TrainerProfile>;
  after: Partial<TrainerProfile>;
  updatedAt: any;
}

export interface ToolMediaItem {
  url: string;
  type: 'VIDEO' | 'IMAGE';
}

export interface ToolUsage {
  id: string;
  title: string;
  description: string;
  /** @deprecated use media[] */
  mediaUrl?: string;
  /** @deprecated use media[] */
  mediaType?: 'VIDEO' | 'IMAGE';
  /** Multiple media (videos/images). When present, takes precedence over mediaUrl/mediaType. */
  media?: ToolMediaItem[];
  category: string;
  trainerEmail: string;
  /** Display name of the registrant (nickname). Shown in list instead of email. */
  trainerNickname?: string;
  isPrivate: boolean;
  targetTraineeEmail?: string;
  createdAt: any;
}

/** 수업/강좌: trainer 이상 생성·수정·삭제, trainee 조회·참석 신청 */
export interface Course {
  id: string;
  title: string;
  trainerEmail: string;
  trainerNickname?: string;
  /** 소속 Gym ID (Gym 관리 목록 기준) */
  gymId?: string;
  dateStr: string;
  timeFrom: string;
  timeTo: string;
  type: '1:1' | '1:2' | '1:n';
  maxParticipants?: number;
  content: string;
  traineeEmails: string[];
  applicationEmails: string[];
  createdBy: string;
  createdByName?: string;
  createdAt: any;
}
