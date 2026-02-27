import { defineStore } from 'pinia'
import { createClass, getClassesByTrainer, addTraineeToClass, removeTraineeFromClass } from '../services/firebaseService'
import type { GymClass } from '../types'
import { useAuthStore } from './auth'
import { useUIStore } from './uiStore'
import { extractErrorMessage } from '../utils/error'

export const useClassStore = defineStore('class', {
    state: () => ({
        classes: [] as GymClass[],
        loading: false,
    }),
    actions: {
        async fetchClasses() {
            const auth = useAuthStore()
            if (!auth.user?.email || !auth.isTrainer) return

            this.loading = true
            try {
                this.classes = await getClassesByTrainer(auth.user.email)
            } catch (e: unknown) {
                const ui = useUIStore()
                ui.showToast(extractErrorMessage(e, 'Failed to fetch classes'), 'error')
            } finally {
                this.loading = false
            }
        },
        async createNewClass(name: string) {
            const auth = useAuthStore()
            if (!auth.user?.email) return

            const newClass: Omit<GymClass, 'id'> = {
                name,
                trainerEmail: auth.user.email,
                traineeEmails: [],
                gymId: auth.user.gymId,
                createdAt: new Date()
            }
            await createClass(newClass)
            await this.fetchClasses()
        },
        async inviteTrainee(classId: string, traineeEmail: string) {
            await addTraineeToClass(classId, traineeEmail)
            await this.fetchClasses()
        },
        async removeTrainee(classId: string, traineeEmail: string) {
            await removeTraineeFromClass(classId, traineeEmail)
            await this.fetchClasses()
        }
    }
})
