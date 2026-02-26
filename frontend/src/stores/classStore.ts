import { defineStore } from 'pinia'
import { createClass, getClassesByTrainer, addTraineeToClass } from '../services/firebaseService'
import type { GymClass } from '../types'
import { useAuthStore } from './auth'

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
            } catch (e) {
                console.error("Failed to fetch classes", e)
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
        }
    }
})
