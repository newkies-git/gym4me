import { defineStore } from 'pinia'
import { getTraineesByTrainer, searchUserByEmail, assignTrainerToTrainee, updateTraineeSession } from '../services/firebaseService'
import type { TraineeInfo } from '../types'
import { useAuthStore } from './auth'
import { useUIStore } from './uiStore'
import { extractErrorMessage } from '../utils/error'

export const useTraineeStore = defineStore('trainee', {
    state: () => ({
        trainees: [] as TraineeInfo[],
        loading: false,
        lastFetch: 0
    }),
    actions: {
        async fetchTrainees(force = false) {
            const authStore = useAuthStore()
            if (!authStore.user?.email || !authStore.isTrainer) return;

            // Cache for 5 minutes unless forced
            if (!force && this.trainees.length > 0 && (Date.now() - this.lastFetch < 300000)) {
                return;
            }

            this.loading = true;
            try {
                this.trainees = await getTraineesByTrainer(authStore.user.email);
                this.lastFetch = Date.now();
            } catch (e: unknown) {
                const ui = useUIStore()
                ui.showToast(extractErrorMessage(e, '트레이니 목록을 불러오지 못했습니다.'), 'error')
            } finally {
                this.loading = false;
            }
        },
        async addTraineeByEmail(email: string) {
            const authStore = useAuthStore()
            if (!authStore.user?.email) throw new Error("Not authenticated");

            const userDoc = await searchUserByEmail(email.trim());
            if (!userDoc) throw new Error('User not found.');

            if (userDoc.data.role === 'TRAINER') {
                throw new Error('Cannot add another trainer as a trainee.');
            }

            await assignTrainerToTrainee(userDoc.id, authStore.user.email);

            // Force refresh to update list
            await this.fetchTrainees(true);
        },
        async updateSessions(traineeId: string, newRemaining: number, expirationDate: string) {
            await updateTraineeSession(traineeId, { remainingSessions: newRemaining, expirationDate });

            // Update local state without fetching
            const trainee = this.trainees.find(t => t.uid === traineeId);
            if (trainee) {
                trainee.remainingSessions = newRemaining;
                trainee.expirationDate = expirationDate;
            }
        },
        clear() {
            this.trainees = [];
            this.lastFetch = 0;
        }
    }
})
