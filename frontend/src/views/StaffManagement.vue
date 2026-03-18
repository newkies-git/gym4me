<template>
  <div class="staff-page">
    <PageHeader
      :title="t('staffMgt.title')"
      :subtitle="t('staffMgt.subtitle')"
      :showBack="true"
      back-url="/home"
    />

    <!-- 상단 액션: 검색 카드 위 -->
    <div class="page-actions">
      <button
        class="btn btn-ghost toolbar-refresh"
        type="button"
        @click="fetchStaffs"
        :aria-label="t('common.refresh')"
        :title="t('common.refresh')"
      >
        ↺ {{ t('common.refresh') }}
      </button>
      <button class="btn btn-primary toolbar-register" @click="openRegisterModal">
        {{ t('common.register') }}
      </button>
    </div>

    <!-- 검색/필터 카드 -->
    <div class="toolbar glass">
      <BaseSearchInput
        v-model="searchQuery"
        class="toolbar-search"
        :placeholder="t('staffMgt.staffList')"
      />

      <BaseSelect
        v-model="roleFilter"
        class="toolbar-select toolbar-select-role"
        :options="[
          { value: '', label: t('staffMgt.filterByRole') },
          { value: 'MANAGER', label: t('staffMgt.roleManager') },
          { value: 'SUB_MANAGER', label: t('staffMgt.roleSubManager') },
          { value: 'TRAINER', label: t('staffMgt.roleTrainer') }
        ]"
      />
      <BaseSelect
        v-model="statusFilter"
        class="toolbar-select toolbar-select-status"
        :options="[
          { value: '', label: t('staffMgt.filterByStatus') },
          { value: 'ACTIVE', label: t('staffDetail.status.ACTIVE') },
          { value: 'ON_LEAVE', label: t('staffDetail.status.ON_LEAVE') },
          { value: 'RESIGNED', label: t('staffDetail.status.RESIGNED') }
        ]"
      />
    </div>

    <!-- 통계 바 -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-chip">
        <span class="stat-num">{{ filteredStaffs.length }}</span>
        <span class="stat-label">{{ t('common.all') }}</span>
      </div>
      <div class="stat-chip manager">
        <span class="stat-num">{{ countByRole('MANAGER') }}</span>
        <span class="stat-label">{{ t('staffMgt.roleManager') }}</span>
      </div>
      <div class="stat-chip sub-manager">
        <span class="stat-num">{{ countByRole('SUB_MANAGER') }}</span>
        <span class="stat-label">{{ t('staffMgt.roleSubManager') }}</span>
      </div>
      <div class="stat-chip trainer">
        <span class="stat-num">{{ countByRole('TRAINER') }}</span>
        <span class="stat-label">{{ t('staffMgt.roleTrainer') }}</span>
      </div>
    </div>

    <!-- 로딩 / 빈 상태 / 그리드 -->
    <div v-if="loading" class="state-box glass">
      <span class="loader"></span>
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="filteredStaffs.length === 0" class="state-box glass">
      <p style="font-size: 1.5rem;">👥</p>
      <p>{{ t('staffMgt.noStaff') }}</p>
    </div>

    <div v-else class="staff-grid">
      <BaseCard
        v-for="staff in filteredStaffs"
        :key="staff.uid"
        class="staff-card"
        :class="{ resigned: staff.employmentStatus === 'RESIGNED' }"
      >
        <!-- 카드 상단: 아바타 + 이름 + 뱃지 -->
        <div class="card-top">
          <div
            class="avatar"
            :class="[(staff.role || '').toLowerCase(), { clickable: !!staff.profileImageUrl }]"
            role="button"
            :tabindex="staff.profileImageUrl ? 0 : -1"
            :aria-label="staff.profileImageUrl ? 'Open profile image' : undefined"
            @click="staff.profileImageUrl && openImagePreview(staff.profileImageUrl)"
            @keydown.enter.prevent="staff.profileImageUrl && openImagePreview(staff.profileImageUrl)"
            @keydown.space.prevent="staff.profileImageUrl && openImagePreview(staff.profileImageUrl)"
          >
            <img v-if="staff.profileImageUrl" :src="staff.profileImageUrl" alt="Profile" />
            <span v-else class="avatar-letter">{{ (staff.name || staff.nickname || staff.email).charAt(0).toUpperCase() }}</span>
          </div>
          <div class="card-identity">
            <h4 class="staff-name">{{ staff.name || staff.nickname || '—' }}</h4>
            <div class="badge-row">
              <span class="role-badge" :class="(staff.role || '').toLowerCase()">{{ getRoleLabel(staff.role) }}</span>
              <span class="status-badge" :class="(staff.employmentStatus || 'ACTIVE').toLowerCase()">
                {{ t(`staffDetail.status.${staff.employmentStatus || 'ACTIVE'}`) }}
              </span>
            </div>
          </div>
          <button
            class="edit-fab"
            @click="openEditModal(staff)"
            :title="t('staffMgt.editStaff')"
          >
            ✏️
          </button>
        </div>

        <!-- 카드 본문 -->
        <div class="card-body">
          <div class="info-row"><span class="info-icon">📧</span><span class="info-val">{{ staff.email }}</span></div>
          <div class="info-row"><span class="info-icon">🏢</span><span class="info-val">{{ gymNames[staff.gymId || ''] || '—' }}</span></div>
          <div class="info-row"><span class="info-icon">📅</span><span class="info-val">{{ staff.joinDate || '—' }}</span></div>
          <div class="info-row"><span class="info-icon">📤</span><span class="info-val">{{ staff.leaveDate || '—' }}</span></div>
        </div>

        <!-- 카드 푸터: 등록자 -->
        <div class="card-footer">
          <span class="reg-by">
            {{ t('staffMgt.registeredBy') }}: {{ formatRegistrant(staff.registeredByEmail) }}
            <span class="reg-sep">·</span>
            {{ t('staffMgt.registeredAt') }}: {{ formatDateTime(staff.registeredAt) }}
          </span>
        </div>
      </BaseCard>
    </div>

    <!-- ── 이미지 미리보기 모달 ── -->
    <BaseModal
      :is-open="showImageModal"
      :title="t('common.details' as any) || 'Image'"
      max-width="720px"
      @close="closeImagePreview"
    >
      <div class="image-preview-modal">
        <img v-if="previewImageUrl" :src="previewImageUrl" alt="Profile" class="image-preview" />
        <div v-else class="empty-state">{{ t('common.na') }}</div>
      </div>
      <template #footer>
        <button class="btn btn-primary btn-sm" type="button" @click="closeImagePreview">
          {{ t('common.close') }}
        </button>
      </template>
    </BaseModal>

    <!-- ── 프로필 뷰 모달 ── -->
    <BaseModal
      :is-open="showProfileModal"
      :title="viewingStaff?.name || viewingStaff?.nickname || viewingStaff?.email || ''"
      max-width="480px"
      @close="showProfileModal = false"
    >
      <div v-if="viewingStaff" class="profile-modal">
        <!-- 아바타 헤더 -->
        <div class="profile-hero">
          <div class="profile-avatar-lg" :class="(viewingStaff.role || '').toLowerCase()">
            <img v-if="viewingTrainerProfile?.photoUrl" :src="viewingTrainerProfile.photoUrl" alt="Profile" />
            <img v-else-if="viewingStaff.profileImageUrl" :src="viewingStaff.profileImageUrl" alt="Profile" />
            <span v-else>{{ (viewingStaff.name || viewingStaff.email).charAt(0).toUpperCase() }}</span>
          </div>
          <div class="profile-hero-info">
            <h3>{{ viewingStaff.name || '—' }}</h3>
            <p class="profile-nickname" v-if="viewingStaff.nickname">@{{ viewingStaff.nickname }}</p>
            <div class="badge-row" style="margin-top: 0.5rem;">
              <span class="role-badge" :class="(viewingStaff.role || '').toLowerCase()">{{ getRoleLabel(viewingStaff.role) }}</span>
              <span class="status-badge" :class="(viewingStaff.employmentStatus || 'ACTIVE').toLowerCase()">
                {{ t(`staffDetail.status.${viewingStaff.employmentStatus || 'ACTIVE'}`) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 트레이너 프로필 섹션 -->
        <template v-if="viewingStaff.role === 'TRAINER'">
          <div v-if="loadingTrainerProfile" class="trainer-loading">
            <span class="loader-sm"></span>
            {{ t('trainerProfile.loadFailed') || t('common.loading') }}
          </div>
          <template v-else-if="viewingTrainerProfile">
            <div v-if="viewingTrainerProfile.bio" class="trainer-section">
              <div class="trainer-section-label">{{ t('trainerProfile.bio') }}</div>
              <p class="trainer-bio">{{ viewingTrainerProfile.bio }}</p>
            </div>
            <div v-if="viewingTrainerProfile.specialties?.length" class="trainer-section">
              <div class="trainer-section-label">{{ t('trainerProfile.specialties') }}</div>
              <div class="tag-row">
                <span v-for="s in viewingTrainerProfile.specialties" :key="s" class="tag">{{ s }}</span>
              </div>
            </div>
            <div v-if="viewingTrainerProfile.career?.length" class="trainer-section">
              <div class="trainer-section-label">{{ t('trainerProfile.career') }}</div>
              <ul class="trainer-list">
                <li v-for="c in viewingTrainerProfile.career" :key="c">{{ c }}</li>
              </ul>
            </div>
            <div v-if="viewingTrainerProfile.awards?.length" class="trainer-section">
              <div class="trainer-section-label">{{ t('trainerProfile.awards') }}</div>
              <ul class="trainer-list">
                <li v-for="a in viewingTrainerProfile.awards" :key="a">{{ a }}</li>
              </ul>
            </div>
          </template>
          <div v-else class="trainer-no-profile">
            {{ t('trainerProfile.noProfile') }}
          </div>
        </template>

        <div class="profile-modal-footer">
          <button class="btn btn-ghost" @click="showProfileModal = false">
            {{ t('common.close') }}
          </button>
        </div>
      </div>
    </BaseModal>

    <!-- ── 등록 모달 ── -->
    <BaseModal
      :is-open="showRegisterModal"
      :title="t('staffMgt.registerModalTitle')"
      max-width="660px"
      @close="showRegisterModal = false"
    >
      <form @submit.prevent="handleRegisterStaff" class="modal-form">
        <div class="form-section">
          <div class="section-label">{{ t('staffDetail.personalInfo') }}</div>
          <div class="field-grid">
            <div class="form-field">
              <label>{{ t('staffDetail.name') }} <span class="req">*</span></label>
              <input type="text" v-model="registerForm.name" required />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.nickname') }}</label>
              <input type="text" v-model="registerForm.nickname" />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.email') }} <span class="req">*</span></label>
              <input type="email" v-model="registerForm.email" required />
            </div>
            <div class="form-field">
              <label>{{ t('staffMgt.passwordLabel') }} <span class="req">*</span></label>
              <input type="password" v-model="registerForm.password" required :placeholder="t('staffMgt.passwordPlaceholder')" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-label">{{ t('staffDetail.workInfo') }}</div>
          <div class="field-grid">
            <div class="form-field">
              <label>{{ t('staffMgt.roleLabel') }} <span class="req">*</span></label>
              <BaseSelect
                v-model="registerForm.role"
                :options="[
                  { value: 'MANAGER', label: t('staffMgt.roleManager') },
                  { value: 'SUB_MANAGER', label: t('staffMgt.roleSubManager') },
                  { value: 'TRAINER', label: t('staffMgt.roleTrainer') }
                ]"
              />
            </div>
            <div class="form-field">
              <label>{{ t('staffMgt.gymLabel') }}</label>
              <BaseSelect
                v-model="registerForm.gymId"
                :options="[
                  { value: '', label: t('staffMgt.gymNone') },
                  ...gyms.map(gym => ({ value: gym.id, label: gym.name }))
                ]"
              />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.joinDate') }}</label>
              <input type="date" v-model="registerForm.joinDate" />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.status.label') }}</label>
              <BaseSelect
                v-model="registerForm.employmentStatus"
                :options="[
                  { value: 'ACTIVE', label: t('staffDetail.status.ACTIVE') },
                  { value: 'ON_LEAVE', label: t('staffDetail.status.ON_LEAVE') },
                  { value: 'RESIGNED', label: t('staffDetail.status.RESIGNED') }
                ]"
              />
            </div>
          </div>
        </div>

        <div v-if="registerError" class="error-box">⚠ {{ registerError }}</div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" @click="showRegisterModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? t('common.processing') : t('staffMgt.addStaff') }}
          </button>
        </div>
      </form>
    </BaseModal>

    <!-- ── 수정 모달 ── -->
    <BaseModal
      :is-open="showEditModal"
      :title="t('staffMgt.editModalTitle')"
      max-width="640px"
      @close="showEditModal = false"
    >
      <form @submit.prevent="handleUpdateStaff" class="modal-form">
        <!-- 편집 대상 요약 -->
        <div v-if="editingStaff" class="editing-summary glass">
          <div class="edit-avatar" :class="(editingStaff.role || '').toLowerCase()">
            {{ (editingStaff.name || editingStaff.email).charAt(0).toUpperCase() }}
          </div>
          <div>
            <div class="edit-name">{{ editingStaff.name || editingStaff.nickname || editingStaff.email }}</div>
            <div class="edit-email">{{ editingStaff.email }}</div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-label">{{ t('staffDetail.personalInfo') }}</div>
          <div class="field-grid">
            <div class="form-field">
              <label>{{ t('staffDetail.name') }}</label>
              <input type="text" v-model="editForm.name" />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.nickname') }}</label>
              <input type="text" v-model="editForm.nickname" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="section-label">{{ t('staffDetail.workInfo') }}</div>
          <div class="field-grid">
            <div class="form-field">
              <label>{{ t('staffMgt.roleLabel') }}</label>
              <BaseSelect
                v-model="editForm.role"
                :options="[
                  { value: 'MANAGER', label: t('staffMgt.roleManager') },
                  { value: 'SUB_MANAGER', label: t('staffMgt.roleSubManager') },
                  { value: 'TRAINER', label: t('staffMgt.roleTrainer') }
                ]"
              />
            </div>
            <div class="form-field">
              <label>{{ t('staffMgt.gymLabel') }}</label>
              <BaseSelect
                v-model="editForm.gymId"
                :options="[
                  { value: '', label: t('staffMgt.gymNone') },
                  ...gyms.map(gym => ({ value: gym.id, label: gym.name }))
                ]"
              />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.joinDate') }}</label>
              <input type="date" v-model="editForm.joinDate" />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.leaveDate') }}</label>
              <input type="date" v-model="editForm.leaveDate" />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.status.label') }}</label>
              <BaseSelect
                v-model="editForm.employmentStatus"
                :options="[
                  { value: 'ACTIVE', label: t('staffDetail.status.ACTIVE') },
                  { value: 'ON_LEAVE', label: t('staffDetail.status.ON_LEAVE') },
                  { value: 'RESIGNED', label: t('staffDetail.status.RESIGNED') }
                ]"
              />
            </div>
          </div>
        </div>

        <!-- 등록자 읽기 전용 -->
        <div class="readonly-meta">
          <span class="meta-lbl">{{ t('staffMgt.registeredBy') }}</span>
          <span class="meta-val">{{ formatRegistrant(editingStaff?.registeredByEmail) }}</span>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" @click="showEditModal = false">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? t('common.processing') : t('common.save') }}
          </button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseSearchInput from '../components/ui/BaseSearchInput.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import { getStaffs, updateStaffData, getGyms, createStaffAccount, getTrainerProfile } from '../services/firebaseService'
import { useAuthStore } from '../stores/auth'
import type { User, Gym, TrainerProfile } from '../types'

const { t } = useI18n()
const authStore = useAuthStore()

const staffs = ref<User[]>([])
const gyms = ref<Gym[]>([])
const loading = ref(true)
const submitting = ref(false)
const showRegisterModal = ref(false)
const showEditModal = ref(false)
const showProfileModal = ref(false)
const showImageModal = ref(false)
const previewImageUrl = ref<string>('')
const viewingStaff = ref<User | null>(null)
const viewingTrainerProfile = ref<TrainerProfile | null>(null)
const loadingTrainerProfile = ref(false)
const gymNames = ref<Record<string, string>>({})
const registerError = ref('')

const searchQuery = ref('')
const roleFilter = ref('')
const statusFilter = ref('')

const registerForm = reactive({
  name: '',
  nickname: '',
  email: '',
  password: '',
  role: 'TRAINER' as 'MANAGER' | 'SUB_MANAGER' | 'TRAINER',
  gymId: '',
  joinDate: '',
  employmentStatus: 'ACTIVE' as 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED'
})

const editForm = reactive<Partial<User>>({})
let selectedStaffUid = ''
const editingStaff = ref<User | null>(null)

const displayNameByEmail = computed(() => {
  const map = new Map<string, string>()
  const me = authStore.user
  if (me?.email) {
    map.set(me.email.toLowerCase(), (me.name || me.nickname || me.email).trim())
  }
  staffs.value.forEach((u) => {
    const email = (u.email || '').trim().toLowerCase()
    if (!email) return
    const label = (u.name || u.nickname || u.email).trim()
    if (!map.has(email)) map.set(email, label)
  })
  return map
})

const formatRegistrant = (email?: string) => {
  const e = (email || '').trim()
  if (!e) return '—'
  return displayNameByEmail.value.get(e.toLowerCase()) || e
}

const openImagePreview = (url: string) => {
  previewImageUrl.value = url
  showImageModal.value = true
}

const closeImagePreview = () => {
  showImageModal.value = false
  previewImageUrl.value = ''
}

const getRoleLabel = (role: string) => {
  if (role === 'MANAGER') return t('staffMgt.roleManager')
  if (role === 'SUB_MANAGER') return t('staffMgt.roleSubManager')
  if (role === 'TRAINER') return t('staffMgt.roleTrainer')
  return role
}

const formatDateTime = (value: unknown): string => {
  if (value == null) return '—'
  try {
    if (typeof (value as any).toDate === 'function') {
      return (value as any).toDate().toLocaleString()
    }
    if (typeof (value as any).toMillis === 'function') {
      return new Date((value as any).toMillis()).toLocaleString()
    }
    if (typeof value === 'number') {
      return new Date(value).toLocaleString()
    }
    if (typeof value === 'string') {
      // ISO string or already formatted
      const d = new Date(value)
      return isNaN(d.getTime()) ? value : d.toLocaleString()
    }
    return String(value)
  } catch {
    return '—'
  }
}

const countByRole = (role: string) =>
  filteredStaffs.value.filter(s => s.role === role).length

const fetchStaffs = async () => {
  loading.value = true
  try {
    const [staffData, gymsData] = await Promise.all([getStaffs(), getGyms()])
    staffs.value = staffData
    gyms.value = gymsData
    gymsData.forEach((g: Gym) => { gymNames.value[g.id] = g.name })
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const filteredStaffs = computed(() =>
  staffs.value.filter(s => {
    const q = searchQuery.value.toLowerCase()
    const matchesSearch = !q ||
      s.name?.toLowerCase().includes(q) ||
      s.nickname?.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    const matchesRole = !roleFilter.value || s.role === roleFilter.value
    const matchesStatus = !statusFilter.value || (s.employmentStatus || 'ACTIVE') === statusFilter.value
    return matchesSearch && matchesRole && matchesStatus
  })
)

const openProfileModal = async (staff: User) => {
  viewingStaff.value = staff
  viewingTrainerProfile.value = null
  showProfileModal.value = true
  if (staff.role === 'TRAINER' && staff.email) {
    loadingTrainerProfile.value = true
    try {
      viewingTrainerProfile.value = await getTrainerProfile(staff.email)
    } catch (e) {
      console.warn('트레이너 프로필 로드 실패', e)
    } finally {
      loadingTrainerProfile.value = false
    }
  }
}

const openRegisterModal = () => {
  Object.assign(registerForm, { name: '', nickname: '', email: '', password: '', role: 'TRAINER', gymId: '', joinDate: '', employmentStatus: 'ACTIVE' })
  registerError.value = ''
  showRegisterModal.value = true
}

const openEditModal = (staff: User) => {
  selectedStaffUid = staff.uid
  editingStaff.value = staff
  Object.assign(editForm, {
    name: staff.name || '',
    nickname: staff.nickname || '',
    role: staff.role || 'TRAINER',
    gymId: staff.gymId || '',
    joinDate: staff.joinDate || '',
    leaveDate: staff.leaveDate || '',
    employmentStatus: staff.employmentStatus || 'ACTIVE'
  })
  showEditModal.value = true
}

const handleRegisterStaff = async () => {
  if (registerForm.password.length < 8) { registerError.value = t('staffMgt.passwordTooShort'); return }
  registerError.value = ''
  submitting.value = true
  try {
    await createStaffAccount({
      name: registerForm.name,
      nickname: registerForm.nickname,
      email: registerForm.email,
      password: registerForm.password,
      role: registerForm.role,
      gymId: registerForm.gymId || undefined,
      joinDate: registerForm.joinDate || undefined,
      employmentStatus: registerForm.employmentStatus,
      registeredByEmail: authStore.user?.email || ''
    })
    await fetchStaffs()
    showRegisterModal.value = false
    alert(t('staffMgt.registerSuccess'))
  } catch (e: any) {
    registerError.value = e?.code === 'auth/email-already-in-use'
      ? t('staffMgt.emailInUse')
      : `${t('staffMgt.registerFailed')}: ${e?.message || ''}`
  } finally {
    submitting.value = false
  }
}

const handleUpdateStaff = async () => {
  if (!selectedStaffUid) return
  submitting.value = true
  try {
    await updateStaffData(selectedStaffUid, { ...editForm, registeredByEmail: editingStaff.value?.registeredByEmail }, {
      actorEmail: authStore.user?.email || '',
      action: 'UPDATE_STAFF_RECORD',
      targetUid: selectedStaffUid
    })
    await fetchStaffs()
    showEditModal.value = false
  } catch (e) {
    console.error(e)
    alert(t('staffDetail.saveFailed'))
  } finally {
    submitting.value = false
  }
}

onMounted(fetchStaffs)
</script>

<style scoped>
/* ── 기본 레이아웃 ── */
.staff-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.88rem;
  margin-top: 0.25rem;
}

/* ── 툴바 ── */
.page-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.25rem;
}

.toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-areas:
    "search search"
    "role  status";
  align-items: center;
  column-gap: 0.875rem;
  row-gap: 0.75rem;
  padding: 0.9rem 1rem;
  border-radius: 0.875rem;
}

.toolbar-search {
  grid-area: search;
  min-width: 0;
}

.toolbar-select-role { grid-area: role; }
.toolbar-select-status { grid-area: status; }

.toolbar-select {
  width: 100%;
  min-width: 0;
}

.toolbar-register {
  width: fit-content;
  min-width: 96px;
  padding-inline: 0.85rem;
}

.toolbar-refresh {
  width: fit-content;
  min-width: 44px;
  padding-inline: 0.6rem;
}

@media (max-width: 640px) {
  .toolbar {
    grid-template-columns: 1fr 1fr;
    grid-template-areas:
      "search search"
      "role status";
    column-gap: 0.6rem;
    row-gap: 0.6rem;
    padding: 0.8rem 0.9rem;
  }
  .page-actions {
    margin-top: 0.25rem;
  }
}

/* ── 통계 ── */
.stats-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.85rem;
  border-radius: 100px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  font-size: 0.82rem;
}

.stat-num { font-weight: 700; font-size: 1rem; }
.stat-label { color: var(--text-muted); }
.stat-chip.manager .stat-num { color: #d946ef; }
.stat-chip.sub-manager .stat-num { color: #f97316; }
.stat-chip.trainer .stat-num { color: #8b5cf6; }

/* ── 상태 박스 ── */
.state-box {
  text-align: center;
  padding: 3rem 1rem;
  border-radius: 1rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.loader {
  display: inline-block;
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── 그리드 ── */
.staff-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

/* ── 카드 ── */
.staff-card {
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: transform 0.15s, box-shadow 0.15s;
}

.staff-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.15);
}

.staff-card.resigned { opacity: 0.6; }

/* 카드 상단 */
.card-top {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  position: relative;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.avatar.clickable {
  cursor: pointer;
}

.avatar.clickable:hover {
  filter: brightness(0.98);
}

.avatar.clickable:focus-visible {
  outline: 2px solid rgba(129, 140, 248, 0.55);
  outline-offset: 2px;
}

.avatar.manager   { background: #fae8ff; color: #d946ef; }
.avatar.sub_manager { background: #fff7ed; color: #f97316; }
.avatar.trainer   { background: #ede9fe; color: #8b5cf6; }

.avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; }

.card-identity { flex: 1; min-width: 0; }

.card-identity h4 {
  margin: 0 0 0.3rem 0;
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.badge-row {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.role-badge {
  font-size: 0.7rem;
  padding: 0.08rem 0.5rem;
  border-radius: 100px;
  font-weight: 700;
}

.role-badge.manager     { color: #d946ef; background: #fae8ff; }
.role-badge.sub_manager  { color: #f97316; background: #fff7ed; }
.role-badge.trainer      { color: #8b5cf6; background: #ede9fe; }

.status-badge {
  font-size: 0.7rem;
  padding: 0.08rem 0.5rem;
  border-radius: 100px;
  font-weight: 600;
}

.status-badge.active   { color: #065f46; background: #d1fae5; }
.status-badge.on_leave { color: #92400e; background: #fef3c7; }
.status-badge.resigned { color: #991b1b; background: #fee2e2; }

.edit-fab {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.25rem 0.4rem;
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.staff-card:hover .edit-fab { opacity: 1; }
.staff-card:focus-within .edit-fab { opacity: 1; }

/* 터치 디바이스(hover 없음)에서는 항상 노출 */
@media (hover: none) and (pointer: coarse) {
  .edit-fab { opacity: 1; }
}

/* 카드 본문 */
.card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem 0.9rem;
  font-size: 0.85rem;
}

.info-row { display: flex; gap: 0.6rem; align-items: center; }
.info-icon { width: 18px; text-align: center; font-size: 0.85rem; }
.info-val { color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 520px) {
  .card-body {
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem 0.65rem;
  }
  .info-row { gap: 0.45rem; }
  .info-icon { width: 16px; }
}

/* 카드 푸터 */
.card-footer {
  border-top: 1px solid var(--border);
  padding-top: 0.6rem;
}

.reg-by { font-size: 0.75rem; color: var(--text-muted); }
.reg-sep { margin: 0 0.35rem; opacity: 0.7; }

.image-preview-modal {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 220px;
}

.image-preview {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--bg-card);
  object-fit: contain;
}

/* ── 모달 내부 ── */
.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-section { display: flex; flex-direction: column; gap: 0.875rem; }

.section-label {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
}

@media (max-width: 520px) {
  .field-grid { grid-template-columns: 1fr; }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-field label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.req { color: #f43f5e; }

/* 편집 대상 요약 */
.editing-summary {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
}

.edit-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edit-avatar.manager    { background: #fae8ff; color: #d946ef; }
.edit-avatar.sub_manager { background: #fff7ed; color: #f97316; }
.edit-avatar.trainer    { background: #ede9fe; color: #8b5cf6; }

.edit-name { font-weight: 700; font-size: 0.95rem; }
.edit-email { font-size: 0.8rem; color: var(--text-muted); }

/* 읽기 전용 메타 */
.readonly-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.6rem 0.875rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-size: 0.82rem;
}

.meta-lbl { color: var(--text-muted); min-width: 60px; }
.meta-val { font-weight: 500; }

/* 에러 */
.error-box {
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  color: #fca5a5;
  border-radius: 0.6rem;
  padding: 0.7rem 1rem;
  font-size: 0.87rem;
}

/* 폼 액션 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

/* 반응형 */
@media (max-width: 600px) {
  .staff-grid { grid-template-columns: 1fr; }
}
/* 프로필 모달 */
.profile-hero {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.profile-avatar-lg {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  flex-shrink: 0;
}

.profile-avatar-lg.manager    { background: #fae8ff; color: #d946ef; }
.profile-avatar-lg.sub_manager { background: #fff7ed; color: #f97316; }
.profile-avatar-lg.trainer    { background: #ede9fe; color: #8b5cf6; }

.profile-avatar-lg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 18px;
}

.profile-hero-info h3 {
  margin: 0;
  font-size: 1.15rem;
}

.profile-nickname {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin-top: 0.15rem;
}

.profile-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.875rem;
  border-top: 1px solid var(--border);
  padding-top: 1.25rem;
  margin-bottom: 1.5rem;
}

.profile-detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.detail-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.detail-val {
  font-size: 0.9rem;
  font-weight: 600;
  word-break: break-all;
}

.profile-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* 이름 텍스트 */
.staff-name {
  margin: 0 0 0.3rem 0;
  font-size: 0.95rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 트레이너 프로필 섹션 */
.trainer-section {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  margin-top: 0.5rem;
}

.trainer-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.trainer-bio {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-main);
  white-space: pre-line;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.tag {
  padding: 0.2rem 0.65rem;
  border-radius: 100px;
  font-size: 0.78rem;
  font-weight: 600;
  background: #ede9fe;
  color: #5e35b1;
}

.trainer-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.trainer-list li {
  font-size: 0.88rem;
  padding-left: 0.75rem;
  position: relative;
}

.trainer-list li::before {
  content: '·';
  position: absolute;
  left: 0;
  color: var(--primary);
  font-weight: 700;
}

.trainer-loading {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1rem 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  border-top: 1px solid var(--border);
}

.loader-sm {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.trainer-no-profile {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-style: italic;
}

</style>
