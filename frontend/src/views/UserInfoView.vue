<template>
  <div class="settings-wrapper container">
    <PageHeader :title="t('settings.title')" show-back />

    <!-- 초기 비밀번호 변경 안내 -->
    <div v-if="auth.user?.mustChangePassword" class="notice-banner glass">
      <strong>{{ t('settings.passwordChangeRequired') }}</strong>
      <p class="sm-text" style="margin-top: 0.4rem;">{{ t('settings.passwordChangeRequiredDesc') }}</p>
    </div>

    <div class="layout-grid">
      <!-- ── 왼쪽 패널 ── -->
      <div class="left-col">

        <!-- 프로필 정보 -->
        <section class="card glass">
          <h3 class="card-title">{{ t('settings.profileInfo') }}</h3>

          <div class="meta-row">
            <div class="meta-item">
              <span class="meta-label">{{ t('settings.role') }}</span>
              <span class="meta-value">{{ formatRole(auth.user?.role) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Lv.</span>
              <span class="meta-value">{{ auth.user?.lvl }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">{{ t('settings.email') }}</span>
              <span class="meta-value email-val">{{ auth.user?.email }}</span>
            </div>
          </div>

          <div class="field" style="margin-top: 1.25rem;">
            <label>{{ t('settings.nickname') }}</label>
            <input v-model="profileForm.nickname" type="text" />
          </div>

          <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" @click="saveProfile" :disabled="savingProfile">
            {{ savingProfile ? t('common.processing') : t('settings.saveProfile') }}
          </button>
        </section>

        <!-- 비밀번호 변경 -->
        <section class="card glass">
          <h3 class="card-title">{{ t('settings.changePassword') }}</h3>
          <p class="sm-text">{{ t('settings.changePasswordDesc') }}</p>

          <div v-if="canChangePassword" class="pw-fields">
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
            <p v-if="passwordError" class="error-text">{{ passwordError }}</p>
            <button class="btn btn-primary" :disabled="changingPassword" @click="handleChangePassword">
              {{ changingPassword ? t('settings.changingPassword') : t('settings.changePasswordBtn') }}
            </button>
          </div>
          <div v-else class="sm-text" style="margin-top: 1rem;">
            {{ t('settings.passwordUnsupported') }}
          </div>
        </section>

        <!-- 위험 구역 — trainee(일반 회원)만 노출 -->
        <section v-if="isTrainee" class="card glass danger-card">
          <h3 class="card-title text-danger">{{ t('settings.dangerZone') }}</h3>
          <p class="sm-text">{{ t('settings.dangerDesc') }}</p>
          <button class="btn btn-danger" style="margin-top: 1.25rem;" @click="showDeleteModal = true">
            {{ t('settings.deleteAccount') }}
          </button>
        </section>

      </div>

      <!-- ── 오른쪽 패널: PT 이용 이력 (trainee만) ── -->
      <div v-if="isTrainee" class="right-col card glass">
        <h3 class="card-title">{{ t('settings.ptSessionHistory') }}</h3>
        <div v-if="loadingHistory" class="sm-text">{{ t('settings.loading') }}</div>
        <div v-else-if="historyGroups.length > 0" class="history-list">
          <div v-for="group in historyGroups" :key="group.date" class="history-group">
            <h4 class="history-date">{{ group.date }}</h4>
            <ul>
              <li v-for="log in group.items" :key="log.id" class="history-item">
                <div class="log-date">{{ formatDate(log.createdAt) }}</div>
                <div class="log-details">
                  <span class="badge" :class="getBadgeClass(log.action)">{{ formatAction(log.action) }}</span>
                  <span class="log-amount">{{ t('settings.sessionsCount', { n: `${log.amountChanged > 0 ? '+' : ''}${log.amountChanged}` }) }}</span>
                  <span class="sm-text log-trainer">{{ t('settings.byTrainer', { email: log.trainerEmail }) }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="empty-state sm-text">{{ t('settings.noHistory') }}</div>
      </div>
    </div>

    <!-- 회원 탈퇴 모달 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content glass" style="max-width: 460px;">
        <h3 class="text-danger">{{ t('settings.deleteModalTitle') }}</h3>
        <p style="margin: 1rem 0;">{{ t('settings.deleteModalDesc') }}</p>
        <p v-html="t('settings.deleteConfirmPrompt')" style="margin-bottom: 1.25rem;"></p>
        <div class="field">
          <input type="text" v-model="deleteConfirmText" :placeholder="deleteConfirmKeyword" style="text-align: center; font-size: 1.05rem;" />
        </div>
        <p v-if="deleteError" class="error-text" style="margin: 0.75rem 0;">{{ deleteError }}</p>
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
import PageHeader from '../components/ui/PageHeader.vue'
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
const passwordError = ref('')
const savingProfile = ref(false)

// Trainee = 일반 회원 (트레이너/매니저/관리자 아님)
const isTrainee = computed(() => !auth.isTrainer)

const formatRole = (roleStr: string | undefined) => {
  if (!roleStr) return ''
  switch (roleStr) {
    case 'MEMBER': return t('role.trainee')
  case 'OBSERVER': return t('role.observer')
    case 'TRAINER': return t('role.trainer')
    case 'MANAGER': return t('role.manager')
  case 'SUB_MANAGER': return t('role.subManager')
    case 'SITE_ADMIN': return t('role.siteAdmin')
    default: return roleStr
  }
}

const profileForm = ref({
  nickname: auth.user?.nickname || '',
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: ''
})

const canChangePassword = computed(() =>
  !!firebaseAuth.currentUser?.providerData.some((p) => p.providerId === 'password')
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
  if (isTrainee.value) loadTicketHistory()
})

const loadTicketHistory = async () => {
  if (!auth.user?.email) return
  loadingHistory.value = true
  try {
    const q = query(collection(db, 'ticketHistory'), where('clientEmail', '==', auth.user.email))
    const snapshot = await getDocs(q)
    let logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    logs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    ticketHistory.value = logs
  } catch (e: unknown) {
    ui.showToast(extractErrorMessage(e, t('settings.historyLoadFailed')), 'error')
  } finally {
    loadingHistory.value = false
  }
}

const formatDate = (ts: any) => ts ? ts.toDate().toLocaleString() : ''
const getBadgeClass = (action: string) => action === 'ADD' ? 'success' : action === 'DEDUCT' ? 'danger' : 'warning'
const formatAction = (action: string) => t(`settings.historyAction.${action.toLowerCase()}`)

const saveProfile = async () => {
  if (!auth.user?.uid) return
  savingProfile.value = true
  try {
    await updateDoc(doc(db, 'users', auth.user.uid), {
      nickname: profileForm.value.nickname.trim(),
    })
    if (auth.user) auth.user.nickname = profileForm.value.nickname.trim()
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
  if (!currentUser || !currentUser.email) { passwordError.value = t('settings.passwordUserNotFound'); return }
  if (!passwordForm.value.currentPassword || !passwordForm.value.newPassword || !passwordForm.value.confirmNewPassword) {
    passwordError.value = t('settings.passwordAllFieldsRequired'); return
  }
  if (passwordForm.value.newPassword.length < 8) { passwordError.value = t('settings.passwordMinLength'); return }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmNewPassword) {
    passwordError.value = t('settings.passwordMismatch'); return
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
  if (deleteConfirmText.value !== deleteConfirmKeyword || !auth.user?.email || !auth.user?.uid) return
  isDeleting.value = true
  deleteError.value = ''
  const userEmail = auth.user.email
  const userUid = auth.user.uid
  try {
    const scheduleOwnerQ = query(collection(db, 'schedules'), where('userEmail', '==', userEmail))
    const scheduleTraineeQ = query(collection(db, 'schedules'), where('clientEmail', '==', userEmail))
    const profileQ = query(collection(db, 'bodyProfiles'), where('userEmail', '==', userEmail))
    const ticketTraineeQ = query(collection(db, 'ticketHistory'), where('clientEmail', '==', userEmail))
    const ticketTrainerQ = query(collection(db, 'ticketHistory'), where('trainerEmail', '==', userEmail))
    const [s1, s2, p1, t1, t2] = await Promise.all([
      getDocs(scheduleOwnerQ), getDocs(scheduleTraineeQ), getDocs(profileQ),
      getDocs(ticketTraineeQ), getDocs(ticketTrainerQ)
    ])
    const deleteMap = new Map<string, ReturnType<typeof deleteDoc>>()
    const enqueue = (docs: Array<{ ref: any }>) => docs.forEach((d) => {
      if (!deleteMap.has(d.ref.path)) deleteMap.set(d.ref.path, deleteDoc(d.ref))
    })
    enqueue(s1.docs); enqueue(s2.docs); enqueue(p1.docs); enqueue(t1.docs); enqueue(t2.docs)
    await Promise.all(deleteMap.values())
    await deleteDoc(doc(db, 'users', userUid))
    if (firebaseAuth.currentUser) await deleteUser(firebaseAuth.currentUser)
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_DELETE_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    if (serviceId && templateId && publicKey) {
      try {
        await emailjs.send(serviceId, templateId, { user_email: userEmail, action: 'ACCOUNT_DELETE', requested_at: new Date().toISOString() }, { publicKey })
      } catch { ui.showToast(t('settings.deleteNotifyFailed'), 'warning') }
    }
    ui.showToast(t('settings.deleteSuccess'), 'success')
    await auth.logout()
    router.push('/')
  } catch (e: unknown) {
    const err = e as any
    deleteError.value = err?.code === 'auth/requires-recent-login'
      ? t('settings.passwordReloginRequired')
      : extractErrorMessage(e, t('settings.deleteFailed', { msg: '' }))
    isDeleting.value = false
    ui.showToast(t('settings.deleteFailed', { msg: deleteError.value }), 'error')
  }
}
</script>

<style scoped>
.settings-wrapper {
  padding: 6rem 1rem 3rem 1rem;
}

.header {
  margin-bottom: 1.5rem;
}

.header h2 {
  font-size: clamp(1.5rem, 2vw, 2rem);
}

.notice-banner {
  padding: 1rem 1.25rem;
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
}

/* Layout */
.layout-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .layout-grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr);
  }
}

.left-col {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Card */
.card {
  padding: 1.5rem;
  border-radius: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1.25rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
}

/* Meta row */
.meta-row {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.meta-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.meta-value {
  font-weight: 700;
  font-size: 0.95rem;
}

.email-val {
  font-size: 0.85rem;
  word-break: break-all;
}

/* Password fields */
.pw-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

/* Danger card */
.danger-card {
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.text-danger { color: #f43f5e; }

/* History */
.right-col {
  padding: 1.5rem;
  border-radius: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-group { }

.history-date {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem 0;
}

.history-group ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.75rem;
  background: var(--bg-dark);
  border-radius: 0.5rem;
}

.log-date {
  font-weight: 600;
  font-size: 0.85rem;
}

.log-details {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.15rem;
  text-align: right;
}

.log-amount {
  font-size: 0.9rem;
  font-weight: 600;
}

.log-trainer {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Badges */
.badge {
  font-size: 0.72rem;
  padding: 0.1rem 0.5rem;
  border-radius: 100px;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.badge.success { background: #d1fae5; color: #065f46; }
.badge.danger  { background: #fee2e2; color: #991b1b; }
.badge.warning { background: #fef3c7; color: #92400e; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  padding: 2rem;
  border-radius: 1rem;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.error-text {
  color: #f87171;
  font-size: 0.88rem;
}

.sm-text {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.empty-state {
  padding: 2rem 0;
  text-align: center;
}
</style>
