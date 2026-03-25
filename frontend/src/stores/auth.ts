import { defineStore } from 'pinia'
import { auth, db, messaging } from '../firebase/config'
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getToken } from 'firebase/messaging'
import type { User } from '../types'
import { useUIStore } from './uiStore'
import { extractErrorMessage } from '../utils/error'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as User | null,
        initialized: false
    }),
    getters: {
        isAuthenticated: (state) => !!state.user,
        userLvl: (state) => state.user?.lvl || 0,
        isSiteAdmin: (state) => (state.user?.lvl || 0) >= 100 || state.user?.role === 'SITE_ADMIN',
        isManager: (state) => state.user?.role === 'MANAGER' || (state.user?.lvl || 0) >= 20,
        isTrainer: (state) => state.user?.role === 'TRAINER' || (state.user?.lvl || 0) >= 10,
        isTrainee: (state) => (state.user?.lvl || 0) >= 5 || (state.user?.remainingSessions || 0) > 0,
        isObserver: (state) => (state.user?.lvl || 0) >= 1,
        isAdmin: (state) => (state.user?.lvl || 0) >= 20,
        /** Trainee/Observer(lvl<10) 이고 프로필 미완료 시 true → 추가 정보 입력 페이지로 유도 */
        needsTraineeProfile: (state) => {
            const u = state.user;
            if (!u) return false;
            const isTraineeOrObserver = (u.lvl || 0) < 10;
            return isTraineeOrObserver && u.profileComplete !== true;
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
            } catch (error: unknown) {
                const ui = useUIStore()
                ui.showToast(extractErrorMessage(error, '사용자 정보를 불러오지 못했습니다.'), 'error')
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
            } catch (error: unknown) {
                const ui = useUIStore()
                ui.showToast(extractErrorMessage(error, '로그아웃에 실패했습니다.'), 'error')
            }
        },
        async requestAndSaveFCMToken(uid: string) {
            if (!messaging) return;
            try {
                const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY || '').trim()
                if (!vapidKey) return
                const swReg = typeof navigator !== 'undefined' && navigator.serviceWorker
                  ? await navigator.serviceWorker.ready
                  : undefined
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    // You should replace VAPID_KEY with your actual web push certificate key from Firebase Console
                    const currentToken = await getToken(messaging, {
                         vapidKey,
                         serviceWorkerRegistration: swReg as any
                    });
                    if (currentToken) {
                        await updateDoc(doc(db, 'users', uid), { fcmToken: currentToken });
                    } else {
                        console.log('No registration token available. Request permission to generate one.');
                    }
                }
            } catch (error: unknown) {
                // best-effort; avoid spamming UI on background failures
                console.warn('FCM token retrieval failed:', error)
            }
        }
    }
})
