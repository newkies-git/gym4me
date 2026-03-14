<template>
  <div class="settings-wrapper container">
    <div class="header page-header flex-between">
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
          <div class="avatar-wrap" v-if="profileForm.profileImageUrl">
            <img :src="profileForm.profileImageUrl" :alt="t('settings.profileImage')" class="avatar-preview" />
          </div>
          <div style="flex: 1; text-align: left;">
            <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">{{ t('settings.role') }}</p>
            <p style="margin: 0; font-weight: 600;">{{ formatRole(auth.user?.role) }}</p>
          </div>
          <div style="flex: 1; text-align: left;">
            <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted);">{{ t('settings.level') }}</p>
            <p style="margin: 0; font-weight: 600;">Lv. {{ auth.user?.lvl }}</p>
          </div>
          <div class="info-group" v-if="auth.user?.nickname">
              <label>{{ t('settings.nickname') }}</label>
              <p>{{ auth.user?.nickname }}</p>
          </div>
          <div class="field" style="margin-top: 0.75rem;">
            <label>{{ t('settings.nickname') }}</label>
            <input v-model="profileForm.nickname" type="text" />
          </div>
          <div class="field">
            <label>{{ t('settings.profileImage') }}</label>
            <input v-model="profileForm.profileImageUrl" type="url" :placeholder="t('settings.profileImagePlaceholder')" />
          </div>
          <button class="btn btn-primary btn-sm" @click="saveProfile" :disabled="savingProfile">
            {{ savingProfile ? t('common.processing') : t('settings.saveProfile') }}
          </button>
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
        <div v-else-if="historyGroups.length > 0" class="history-list">
            <div v-for="group in historyGroups" :key="group.date" class="history-group">
              <h4 class="history-date">{{ group.date }}</h4>
              <ul>
                <li v-for="log in group.items" :key="log.id" class="history-item flex-between" style="flex-direction: row; align-items: center;">
                    <div class="log-date" style="font-weight: 600; font-size: 0.9rem;">{{ formatDate(log.createdAt) }}</div>
                    <div class="log-details" style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; text-align: right;">
                        <span class="badge" :class="getBadgeClass(log.action)">{{ formatAction(log.action) }}</span>
                        <span style="font-size: 0.95rem;">{{ t('settings.sessionsCount', { n: `${log.amountChanged > 0 ? '+' : ''}${log.amountChanged}` }) }}</span>
                        <span class="sm-text" style="font-size: 0.8rem; color: var(--text-muted);">{{ t('settings.byTrainer', { email: log.trainerEmail }) }}</span>
                    </div>
                </li>
              </ul>
            </div>
        </div>
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
import emailjs from '@emailjs/browser'
import { extractErrorMessage } from '../utils/error'

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
const isSubmitting = ref(false)
const passwordError = ref('')
const savingProfile = ref(false)

const formatRole = (roleStr: string | undefined) => {
  if (!roleStr) return ''
  switch(roleStr) {
    case 'MEMBER': return t('role.member')
    case 'TRAINER': return t('role.trainer')
    case 'MANAGER': return t('role.manager')
    case 'SITE_ADMIN': return t('role.siteAdmin')
    default: return roleStr
  }
}

const profileForm = ref({
    nickname: auth.user?.nickname || '',
    profileImageUrl: (auth.user as any)?.profileImageUrl || ''
})

const passwordForm = ref({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
})

const canChangePassword = computed(() =>
    !!firebaseAuth.currentUser?.providerData.some((provider) => provider.providerId === 'password')
)
const historyGroups = computed(() => {
    const bucket = new Map<string, any[]>()
    ticketHistory.value.forEach((log) => {
        const dateKey = log.createdAt?.toDate?.()?.toLocaleDateString() || '-'
        const prev = bucket.get(dateKey) || []
        prev.push(log)
        bucket.set(dateKey, prev)
    })
    return Array.from(bucket.entries()).map(([date, items]) => ({ date, items }))
})

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
    } catch(e: unknown) {
        ui.showToast(extractErrorMessage(e, t('settings.historyLoadFailed')), 'error')
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

const saveProfile = async () => {
    if (!auth.user?.uid) return
    savingProfile.value = true
    try {
        await updateDoc(doc(db, 'users', auth.user.uid), {
            nickname: profileForm.value.nickname.trim(),
            profileImageUrl: profileForm.value.profileImageUrl.trim() || null
        })
        if (auth.user) {
            auth.user.nickname = profileForm.value.nickname.trim()
            ;(auth.user as any).profileImageUrl = profileForm.value.profileImageUrl.trim() || undefined
        }
        ui.showToast(t('settings.profileSaveSuccess'), 'success')
    } catch (e: unknown) {
        ui.showToast(extractErrorMessage(e, t('settings.profileSaveFailed')), 'error')
    } finally {
        savingProfile.value = false
    }
}

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

        const templateParams = {
            user_email: userEmail,
            action: 'ACCOUNT_DELETE',
            requested_at: new Date().toISOString()
        }
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
        const templateId = import.meta.env.VITE_EMAILJS_DELETE_TEMPLATE_ID
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        if (serviceId && templateId && publicKey) {
            try {
                await emailjs.send(serviceId, templateId, templateParams, { publicKey })
            } catch {
                ui.showToast(t('settings.deleteNotifyFailed'), 'warning')
            }
        }

        ui.showToast(t('settings.deleteSuccess'), 'success')
        await auth.logout();
        router.push('/');
    } catch(e: unknown) {
        const err = e as any
        if (err?.code === 'auth/requires-recent-login') {
            deleteError.value = t('settings.passwordReloginRequired')
        } else {
            deleteError.value = extractErrorMessage(e, t('settings.deleteFailed', { msg: '' }))
        }
        isDeleting.value = false;
        ui.showToast(t('settings.deleteFailed', { msg: deleteError.value }), 'error')
    }
}
</script>

<style scoped>
.settings-wrapper {
  padding: 6rem 1rem 2rem 1rem;
}

.header {
  margin-bottom: 1.35rem;
  gap: 0.8rem;
}

.header h2 {
  font-size: clamp(1.6rem, 2vw, 2rem);
}

@media (min-width: 768px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1080px) {
  .grid-2 {
    grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.9fr);
  }
}
</style>
