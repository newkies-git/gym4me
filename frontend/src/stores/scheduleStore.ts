import { defineStore } from 'pinia'
import { getSchedules, addSchedule, updateSchedule, getSchedulesByClass } from '../services/firebaseService'
import type { CalendarEvent } from '../types'
import { useAuthStore } from './auth'
import { useUIStore } from './uiStore'
import { extractErrorMessage } from '../utils/error'

export const useScheduleStore = defineStore('schedule', {
    state: () => ({
        schedules: {} as Record<string, CalendarEvent[]>, // Keyed by email OR classId
        loading: false,
        lastFetch: {} as Record<string, number>
    }),
    actions: {
        async fetchSchedules(targetEmail: string, force = false) {
            const auth = useAuthStore()
            if (!targetEmail) return;
            if (!auth.user) return;

            const last = this.lastFetch[targetEmail] || 0;
            if (!force && this.schedules[targetEmail] && (Date.now() - last < 300000)) {
                return;
            }

            this.loading = true;
            try {
                const results = await getSchedules(targetEmail, auth.user);
                this.schedules[targetEmail] = results;
                this.lastFetch[targetEmail] = Date.now();
            } catch (e: unknown) {
                const ui = useUIStore()
                ui.showToast(extractErrorMessage(e, `Failed to fetch schedules for ${targetEmail}`), 'error')
            } finally {
                this.loading = false;
            }
        },
        async fetchClassSchedules(classId: string, force = false) {
            const auth = useAuthStore()
            if (!classId) return;
            if (!auth.user) return;

            const last = this.lastFetch[classId] || 0;
            if (!force && this.schedules[classId] && (Date.now() - last < 300000)) {
                return;
            }

            this.loading = true;
            try {
                const results = await getSchedulesByClass(classId, auth.user);
                this.schedules[classId] = results;
                this.lastFetch[classId] = Date.now();
            } catch (e: unknown) {
                const ui = useUIStore()
                ui.showToast(extractErrorMessage(e, `Failed to fetch schedules for class ${classId}`), 'error')
            } finally {
                this.loading = false;
            }
        },
        async createSchedule(data: any) {
            await addSchedule(data);
            // Invalidate cache for this user
            const targetEmail = data.userEmail;
            if (targetEmail) {
                await this.fetchSchedules(targetEmail, true);
            }
        },
        async modifySchedule(id: string, targetEmail: string, updates: any) {
            await updateSchedule(id, updates);
            // Invalidate or update locally
            await this.fetchSchedules(targetEmail, true);
        },
        clear() {
            this.schedules = {};
            this.lastFetch = {};
        }
    },
    getters: {
        getSchedulesByEmail: (state) => {
            return (email: string) => state.schedules[email] || [];
        }
    }
})
