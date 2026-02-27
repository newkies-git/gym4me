<template>
  <div class="settings-wrapper container">
    <div class="header flex-between">
      <h2>{{ t('settings.title') }}</h2>
      <button class="btn btn-ghost" @click="router.back()">{{ t('settings.back') }}</button>
    </div>

    <div v-if="auth.user?.mustChangePassword" class="glass" style="padding: 1rem 1.25rem; border: 1px solid rgba(245, 158, 11, 0.35); margin-bottom: 1rem;">
      <strong>{{ t('settings.passwordChangeRequired') }}</strong>
      <p class="sm-text" style="margin-top: 0.4rem;">{{ t('settings.passwordChangeRequiredDesc') }}</p>
    </div>

    <div class="grid-2" style="margin-top: 2rem;">
      <div class="left-panel">
        <!-- Profile Info Section -->
        <div class="info-section glass">
          <h3>{{ t('settings.profileInfo') }}</h3>
          <div class="info-group">
              <label>{{ t('settings.email') }}</label>
              <p>{{ auth.user?.email }}</p>
          </div>
          <div class="info-group">
              <label>{{ t('settings.role') }}</label>
              <p>{{ auth.user?.role }}</p>
          </div>
          <div class="info-group" v-if="auth.user?.nickname">
              <label>{{ t('settings.nickname') }}</label>
              <p>{{ auth.user?.nickname }}</p>
          </div>
        </div>

        <div class="password-section glass" style="margin-top: 2rem;">
          <h3>{{ t('settings.changePassword') }}</h3>
          <p class="sm-text">{{ t('settings.changePasswordDesc') }}</p>

          <div v-if="canChangePassword" style="margin-top: 1rem;">
            <div class="field">
              <label>{{ t('settings.currentPassword') }}</label>
              <input v-model="passwordForm.currentPassword" type="password" autocomplete="current-password" />
            </div>
            <div class="field">
              <label>{{ t('settings.newPassword') }}</label>
              <input v-model="passwordForm.newPassword" type="password" autocomplete="new-password" />
            </div>
            <div class="field">
              <label>{{ t('settings.confirmNewPassword') }}</label>
              <input v-model="passwordForm.confirmNewPassword" type="password" autocomplete="new-password" />
            </div>

            <p v-if="passwordError" class="error-text" style="margin-top: 0.75rem;">{{ passwordError }}</p>
            <button class="btn btn-primary" style="margin-top: 1rem;" :disabled="changingPassword" @click="handleChangePassword">
              {{ changingPassword ? t('settings.changingPassword') : t('settings.changePasswordBtn') }}
            </button>
          </div>
          <div v-else style="margin-top: 1rem;" class="sm-text">
            {{ t('settings.passwordUnsupported') }}
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="danger-zone glass" style="margin-top: 2rem;">
          <h3 class="text-danger">{{ t('settings.dangerZone') }}</h3>
          <p class="sm-text">{{ t('settings.dangerDesc') }}</p>
          <button class="btn btn-danger" style="margin-top: 1.5rem;" @click="showDeleteModal = true">{{ t('settings.deleteAccount') }}</button>
        </div>
      </div>

      <!-- Ticket History Section (For Members) -->
      <div v-if="!auth.isTrainer" class="history-section glass">
        <h3>{{ t('settings.ptSessionHistory') }}</h3>
        <div v-if="loadingHistory" class="sm-text">{{ t('settings.loading') }}</div>
        <ul v-else-if="ticketHistory.length > 0" class="history-list">
            <li v-for="log in ticketHistory" :key="log.id" class="history-item flex-between" style="flex-direction: row; align-items: center;">
                <div class="log-date" style="font-weight: 600; font-size: 0.9rem;">{{ formatDate(log.createdAt) }}</div>
                <div class="log-details" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; text-align: right;">
                    <span class="badge" :class="getBadgeClass(log.action)">{{ formatAction(log.action) }}</span>
                    <span style="font-size: 0.95rem;">{{ t('settings.sessionsCount', { n: `${log.amountChanged > 0 ? '+' : ''}${log.amountChanged}` }) }}</span>
                    <span class="sm-text" style="font-size: 0.8rem; color: var(--text-muted);">{{ t('settings.byTrainer', { email: log.trainerEmail }) }}</span>
                </div>
            </li>
        </ul>
        <div v-else class="empty-state">{{ t('settings.noHistory') }}</div>
      </div>
    </div>

    <!-- Account Deletion Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal-content glass" style="max-width: 450px;">
            <h3 class="text-danger">{{ t('settings.deleteModalTitle') }}</h3>
            <p style="margin-bottom: 1rem;">{{ t('settings.deleteModalDesc') }}</p>
            <p style="margin-bottom: 1.5rem;" v-html="t('settings.deleteConfirmPrompt')"></p>
            
            <div class="field">
                <input type="text" v-model="deleteConfirmText" :placeholder="deleteConfirmKeyword" style="text-align: center; font-size: 1.1rem;">
            </div>
            
            <p v-if="deleteError" class="error-text" style="margin-bottom: 1.5rem;">{{ deleteError }}</p>
            
            <div class="modal-actions">
                <button class="btn btn-ghost" @click="showDeleteModal = false" :disabled="isDeleting">{{ t('settings.cancel') }}</button>
                <button class="btn btn-danger" @click="executeDeletion" :disabled="deleteConfirmText !== deleteConfirmKeyword || isDeleting">
                    {{ isDeleting ? t('settings.deleting') : t('settings.permanentlyDelete') }}
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'
import { auth as firebaseAuth, db } from '../firebase/config'
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'

const auth = useAuthStore()
const ui = useUIStore()
const router = useRouter()
const { t } = useI18n()

const ticketHistory = ref<any[]>([])
const loadingHistory = ref(false)
const showDeleteModal = ref(false)
const deleteConfirmText = ref('')
const isDeleting = ref(false)
const deleteError = ref('')
const deleteConfirmKeyword = t('settings.deleteConfirmKeyword')
const changingPassword = ref(false)
const passwordError = ref('')

const passwordForm = ref({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
})

const canChangePassword = computed(() =>
    !!firebaseAuth.currentUser?.providerData.some((provider) => provider.providerId === 'password')
)

onMounted(() => {
    if (!auth.isTrainer) {
        loadTicketHistory()
    }
})

const loadTicketHistory = async () => {
    if (!auth.user?.email) return;
    loadingHistory.value = true;
    try {
        const q = query(
            collection(db, 'ticketHistory'),
            where('clientEmail', '==', auth.user.email)
        )
        const snapshot = await getDocs(q)
        let logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        logs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
        ticketHistory.value = logs;
    } catch(e) {
        console.error("Failed to load history", e)
    } finally {
        loadingHistory.value = false;
    }
}

const formatDate = (timestamp: any) => timestamp ? timestamp.toDate().toLocaleString() : '';

const getBadgeClass = (action: string) => {
    if (action === 'ADD') return 'success';
    if (action === 'DEDUCT') return 'danger';
    return 'warning';
}

const formatAction = (action: string) => t(`settings.historyAction.${action.toLowerCase()}`)

const handleChangePassword = async () => {
    passwordError.value = ''
    const currentUser = firebaseAuth.currentUser
    if (!currentUser || !currentUser.email) {
        passwordError.value = t('settings.passwordUserNotFound')
        return
    }

    if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmNewPassword) {
        passwordError.value = t('settings.passwordAllFieldsRequired')
        return
    }

    if (passwordForm.value.newPassword.length < 8) {
        passwordError.value = t('settings.passwordMinLength')
        return
    }

    if (passwordForm.value.newPassword !== passwordForm.value.confirmNewPassword) {
        passwordError.value = t('settings.passwordMismatch')
        return
    }

    changingPassword.value = true
    try {
        const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.value.currentPassword)
        await reauthenticateWithCredential(currentUser, credential)
        await updatePassword(currentUser, passwordForm.value.newPassword)
        if (auth.user?.uid) {
            await updateDoc(doc(db, 'users', auth.user.uid), { mustChangePassword: false })
            if (auth.user) auth.user.mustChangePassword = false
        }
        passwordForm.value = { currentPassword: '', newPassword: '', confirmNewPassword: '' }
        ui.showToast(t('settings.passwordChangeSuccess'), 'success')
    } catch (e: any) {
        if (e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
            passwordError.value = t('settings.passwordCurrentInvalid')
        } else if (e?.code === 'auth/weak-password') {
            passwordError.value = t('settings.passwordWeak')
        } else if (e?.code === 'auth/requires-recent-login') {
            passwordError.value = t('settings.passwordReloginRequired')
        } else {
            passwordError.value = e?.message || t('settings.passwordChangeFailed')
        }
        ui.showToast(t('settings.passwordChangeFailed'), 'error')
    } finally {
        changingPassword.value = false
    }
}

const executeDeletion = async () => {
    if (deleteConfirmText.value !== deleteConfirmKeyword || !auth.user?.email || !auth.user?.uid) return;
    isDeleting.value = true;
    deleteError.value = '';
    const userEmail = auth.user.email;
    const userUid = auth.user.uid;
    
    try {
        const scheduleOwnerQ = query(collection(db, 'schedules'), where('userEmail', '==', userEmail));
        const scheduleClientQ = query(collection(db, 'schedules'), where('clientEmail', '==', userEmail));
        const profileQ = query(collection(db, 'bodyProfiles'), where('userEmail', '==', userEmail));
        const ticketClientQ = query(collection(db, 'ticketHistory'), where('clientEmail', '==', userEmail));
        const ticketTrainerQ = query(collection(db, 'ticketHistory'), where('trainerEmail', '==', userEmail));

        const [scheduleOwnerSnap, scheduleClientSnap, profileSnap, ticketClientSnap, ticketTrainerSnap] = await Promise.all([
            getDocs(scheduleOwnerQ),
            getDocs(scheduleClientQ),
            getDocs(profileQ),
            getDocs(ticketClientQ),
            getDocs(ticketTrainerQ)
        ])

        const deleteMap = new Map<string, ReturnType<typeof deleteDoc>>()
        const enqueueDeletes = (docs: Array<{ ref: any }>) => {
            docs.forEach((d) => {
                if (!deleteMap.has(d.ref.path)) {
                    deleteMap.set(d.ref.path, deleteDoc(d.ref))
                }
            })
        }

        enqueueDeletes(scheduleOwnerSnap.docs)
        enqueueDeletes(scheduleClientSnap.docs)
        enqueueDeletes(profileSnap.docs)
        enqueueDeletes(ticketClientSnap.docs)
        enqueueDeletes(ticketTrainerSnap.docs)

        await Promise.all(deleteMap.values());
        await deleteDoc(doc(db, 'users', userUid));

        if (firebaseAuth.currentUser) {
            await deleteUser(firebaseAuth.currentUser);
        }

        ui.showToast(t('settings.deleteSuccess'), 'success')
        await auth.logout();
        router.push('/');
    } catch(e: any) {
        if (e?.code === 'auth/requires-recent-login') {
            deleteError.value = t('settings.passwordReloginRequired')
        } else {
            deleteError.value = e.message || t('settings.deleteFailed', { msg: '' });
        }
        isDeleting.value = false;
        ui.showToast(t('settings.deleteFailed', { msg: deleteError.value }), 'error')
    }
}
</script>

<style scoped>
.settings-wrapper {
  padding: 0.5rem 0 1.5rem;
}

.header {
  margin-bottom: 1.35rem;
  gap: 0.8rem;
}

.header h2 {
  font-size: clamp(1.6rem, 2vw, 2rem);
}

.grid-2 {
  align-items: start;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.9fr);
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.info-section, .history-section, .password-section, .danger-zone {
  padding: 1.65rem;
}
h3 { margin-bottom: 1.5rem; }

.info-group { margin-bottom: 1.25rem; }
.info-group label { color: var(--text-muted); font-size: 0.85rem; font-weight: 600; display: block; margin-bottom: 0.25rem; }
.info-group p { font-size: 1.05rem; }

.history-list { max-height: 500px; overflow-y: auto; }
.badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 1rem; color: white; display: inline-block; font-weight: 600; }
.badge.success { background: #10b981; }
.badge.danger { background: #f43f5e; }
.badge.warning { background: #f59e0b; }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }

.danger-zone {
  border: 1px solid rgba(244, 63, 94, 0.2);
  background: rgba(244, 63, 94, 0.045);
}
.text-danger { color: #f43f5e !important; }

.sm-text { font-size: 0.85rem; color: var(--text-muted); }

.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000; backdrop-filter: blur(5px);
}
.modal-content { padding: 2.5rem; width: 90%; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 2rem; }

@media (max-width: 1080px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
