import { defineStore } from 'pinia'
import { auth, db } from '../firebase/config'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as User | null,
        initialized: false
    }),
    getters: {
        isAuthenticated: (state) => !!state.user,
        userLvl: (state) => state.user?.lvl || 0,
        isSiteAdmin: (state) => (state.user?.lvl || 0) >= 100 || state.user?.role === 'SITE_ADMIN',
        isManager: (state) => (state.user?.lvl || 0) >= 20,
        isTrainer: (state) => (state.user?.lvl || 0) >= 10,
        isMember: (state) => (state.user?.lvl || 0) >= 5 || (state.user?.remainingSessions || 0) > 0,
        isObserver: (state) => (state.user?.lvl || 0) >= 1,
        isAdmin: (state) => (state.user?.lvl || 0) >= 20,
    },
    actions: {
        initAuth() {
            return new Promise<void>((resolve) => {
                onAuthStateChanged(auth, async (firebaseUser) => {
                    if (firebaseUser) {
                        await this.fetchUserRole(firebaseUser);
                    } else {
                        this.user = null;
                    }
                    this.initialized = true;
                    resolve();
                });
            });
        },
        async fetchUserRole(firebaseUser: FirebaseUser) {
            try {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    this.user = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        nickname: data.nickname,
                        profileImageUrl: data.profileImageUrl,
                        lvl: data.lvl || 1,
                        role: data.role || 'MEMBER',
                        gymId: data.gymId,
                        remainingSessions: data.remainingSessions,
                        expirationDate: data.expirationDate,
                        mustChangePassword: data.mustChangePassword === true
                    };
                } else {
                    // Default user profile if doesn't exist in Firestore
                    this.user = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        nickname: firebaseUser.email?.split('@')[0],
                        lvl: 1,
                        role: 'MEMBER'
                    };
                    // optionally save to db here: await setDoc(doc(db, 'users', firebaseUser.uid), this.user)
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
                this.user = null;
            }
        },
        async logout() {
            try {
                await signOut(auth);
                this.user = null;
            } catch (error) {
                console.error("Error signing out:", error);
            }
        }
    }
})
