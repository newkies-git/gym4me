import { defineStore } from 'pinia'
import { auth, db, messaging } from '../firebase/config'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getToken } from 'firebase/messaging'
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
        /** Trainee/Observer(lvl<10) 이고 프로필 미완료 시 true → 추가 정보 입력 페이지로 유도 */
        needsMemberProfile: (state) => {
            const u = state.user;
            if (!u) return false;
            const isMemberOrObserver = (u.lvl || 0) < 10;
            return isMemberOrObserver && u.profileComplete !== true;
        },
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
                        name: data.name,
                        nickname: data.nickname,
                        phone: data.phone,
                        profileImageUrl: data.profileImageUrl,
                        lvl: data.lvl || 1,
                        role: data.role || 'MEMBER',
                        gymId: data.gymId,
                        remainingSessions: data.remainingSessions,
                        expirationDate: data.expirationDate,
                        mustChangePassword: data.mustChangePassword === true,
                        profileComplete: data.profileComplete === true
                    };
                    
                    // Request FCM Token in background
                    this.requestAndSaveFCMToken(firebaseUser.uid);
                } else {
                    // Default user profile if doesn't exist in Firestore
                    this.user = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        nickname: firebaseUser.email?.split('@')[0],
                        lvl: 1,
                        role: 'MEMBER',
                        profileComplete: false
                    };
                    // optionally save to db here: await setDoc(doc(db, 'users', firebaseUser.uid), this.user)
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
                this.user = null;
            }
        },
        async refreshUser() {
            const firebaseUser = auth.currentUser;
            if (firebaseUser) await this.fetchUserRole(firebaseUser);
        },
        async logout() {
            try {
                await signOut(auth);
                this.user = null;
            } catch (error) {
                console.error("Error signing out:", error);
            }
        },
        async requestAndSaveFCMToken(uid: string) {
            if (!messaging) return;
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // You should replace VAPID_KEY with your actual web push certificate key from Firebase Console
                    const currentToken = await getToken(messaging, {
                         vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                    });
                    if (currentToken) {
                        await updateDoc(doc(db, 'users', uid), { fcmToken: currentToken });
                    } else {
                        console.log('No registration token available. Request permission to generate one.');
                    }
                }
            } catch (error) {
                console.error('An error occurred while retrieving token. ', error);
            }
        }
    }
})
