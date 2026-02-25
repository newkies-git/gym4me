import { defineStore } from 'pinia'
import { getSchedules, addSchedule, updateSchedule } from '../services/firebaseService'
import type { CalendarEvent } from '../types'
import { useAuthStore } from './auth'

export const useScheduleStore = defineStore('schedule', {
    state: () => ({
        schedules: {} as Record<string, CalendarEvent[]>, // Keyed by email
        loading: false,
        lastFetch: {} as Record<string, number>
    }),
    actions: {
        async fetchSchedules(targetEmail: string, force = false) {
            if (!targetEmail) return;

            // Cache for 5 minutes unless forced
            const last = this.lastFetch[targetEmail] || 0;
            if (!force && this.schedules[targetEmail] && (Date.now() - last < 300000)) {
                return;
            }

            this.loading = true;
            try {
                const results = await getSchedules(targetEmail);
                this.schedules[targetEmail] = results;
                this.lastFetch[targetEmail] = Date.now();
            } catch (e) {
                console.error("Failed to fetch schedules for", targetEmail, e);
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
