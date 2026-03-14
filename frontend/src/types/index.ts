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
