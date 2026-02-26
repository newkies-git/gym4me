export interface User {
  uid: string;
  email: string;
  nickname?: string;
  lvl: number;
  role: string;
  gymId?: string;
  remainingSessions?: number;
  expirationDate?: string;
  mustChangePassword?: boolean;
}

export interface Gym {
  id: string;
  name: string;
  location?: string;
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
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';
  clientEmail?: string; // INDIVIDUAL 인 경우
  classId?: string;     // CLASS 인 경우
  trainerEmail?: string;
  notes?: string;
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
  updatedAt: any;
}

export interface ProfileHistory {
  id: string;
  trainerEmail: string;
  before: Partial<TrainerProfile>;
  after: Partial<TrainerProfile>;
  updatedAt: any;
}
