import { defineStore } from 'pinia'
import { getBodyProfiles, addBodyProfile } from '../services/firebaseService'
import type { BodyRecord } from '../types'

export const useProfileStore = defineStore('profile', {
    state: () => ({
        profiles: {} as Record<string, BodyRecord[]>, // Keyed by email
        loading: false,
        lastFetch: {} as Record<string, number>
    }),
    actions: {
        async fetchProfiles(targetEmail: string, force = false) {
            if (!targetEmail) return;

            const last = this.lastFetch[targetEmail] || 0;
            // Cache for 5 minutes
            if (!force && this.profiles[targetEmail] && (Date.now() - last < 300000)) {
                return;
            }

            this.loading = true;
            try {
                const results = await getBodyProfiles(targetEmail);
                // Sort ascending by date for chart
                results.sort((a, b) => a.date.localeCompare(b.date));
                this.profiles[targetEmail] = results;
                this.lastFetch[targetEmail] = Date.now();
            } catch (e) {
                console.error("Failed to fetch profiles for", targetEmail, e);
            } finally {
                this.loading = false;
            }
        },
        async saveProfile(targetEmail: string, data: Partial<BodyRecord>) {
            await addBodyProfile(targetEmail, data);
            // Invalidate cache to force fresh fetch or update locally
            await this.fetchProfiles(targetEmail, true);
        },
        clear() {
            this.profiles = {};
            this.lastFetch = {};
        }
    },
    getters: {
        getProfilesByEmail: (state) => {
            return (email: string) => state.profiles[email] || [];
        }
    }
})
