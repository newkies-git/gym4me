import { defineStore } from 'pinia'
import { getClientsByTrainer, searchUserByEmail, assignTrainerToClient, updateClientSession } from '../services/firebaseService'
import type { ClientInfo } from '../types'
import { useAuthStore } from './auth'

export const useClientStore = defineStore('client', {
    state: () => ({
        clients: [] as ClientInfo[],
        loading: false,
        lastFetch: 0
    }),
    actions: {
        async fetchClients(force = false) {
            const authStore = useAuthStore()
            if (!authStore.user?.email || !authStore.isTrainer) return;

            // Cache for 5 minutes unless forced
            if (!force && this.clients.length > 0 && (Date.now() - this.lastFetch < 300000)) {
                return;
            }

            this.loading = true;
            try {
                this.clients = await getClientsByTrainer(authStore.user.email);
                this.lastFetch = Date.now();
            } catch (e) {
                console.error("Failed to fetch clients", e);
            } finally {
                this.loading = false;
            }
        },
        async addClientByEmail(email: string) {
            const authStore = useAuthStore()
            if (!authStore.user?.email) throw new Error("Not authenticated");

            const userDoc = await searchUserByEmail(email.trim());
            if (!userDoc) throw new Error('User not found.');

            if (userDoc.data.role === 'TRAINER') {
                throw new Error('Cannot add another trainer as a client.');
            }

            await assignTrainerToClient(userDoc.id, authStore.user.email);

            // Force refresh to update list
            await this.fetchClients(true);
        },
        async updateSessions(clientId: string, newRemaining: number, expirationDate: string) {
            await updateClientSession(clientId, { remainingSessions: newRemaining, expirationDate });

            // Update local state without fetching
            const client = this.clients.find(c => c.uid === clientId);
            if (client) {
                client.remainingSessions = newRemaining;
                client.expirationDate = expirationDate;
            }
        },
        clear() {
            this.clients = [];
            this.lastFetch = 0;
        }
    }
})
