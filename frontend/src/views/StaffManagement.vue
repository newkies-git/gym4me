<template>
  <div class="staff-page">
    <PageHeader
      :title="t('staffMgt.title')"
      :subtitle="t('staffMgt.subtitle')"
    />

    <!-- 툴바: 버튼 + 검색/필터 -->
    <div class="toolbar">
      <div class="filter-bar glass">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            v-model="searchQuery"
            :placeholder="t('staffMgt.staffList')"
            class="search-input"
          />
        </div>
        <div class="filter-chips">
          <select v-model="roleFilter" class="chip-select">
            <option value="">{{ t('staffMgt.filterByRole') }}</option>
            <option value="MANAGER">{{ t('staffMgt.roleManager') }}</option>
            <option value="SUB_MANAGER">{{ t('staffMgt.roleSubManager') }}</option>
            <option value="TRAINER">{{ t('staffMgt.roleTrainer') }}</option>
          </select>
          <select v-model="statusFilter" class="chip-select">
            <option value="">{{ t('staffMgt.filterByStatus') }}</option>
            <option value="ACTIVE">{{ t('staffDetail.status.ACTIVE') }}</option>
            <option value="ON_LEAVE">{{ t('staffDetail.status.ON_LEAVE') }}</option>
            <option value="RESIGNED">{{ t('staffDetail.status.RESIGNED') }}</option>
          </select>
        </div>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-ghost" @click="fetchStaffs">↺ {{ t('common.refresh') }}</button>
        <button class="btn btn-primary" @click="openRegisterModal">+ {{ t('staffMgt.addStaff') }}</button>
      </div>
    </div>

    <!-- 통계 바 -->
    <div class="stats-row" v-if="!loading">
      <div class="stat-chip">
        <span class="stat-num">{{ filteredStaffs.length }}</span>
        <span class="stat-label">전체</span>
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
      <div
        v-for="staff in filteredStaffs"
        :key="staff.uid"
        class="staff-card glass"
        :class="{ resigned: staff.employmentStatus === 'RESIGNED' }"
      >
        <!-- 카드 상단: 아바타 + 이름 + 뱃지 -->
        <div class="card-top">
          <div class="avatar" :class="(staff.role || '').toLowerCase()">
            <img v-if="staff.profileImageUrl" :src="staff.profileImageUrl" alt="Profile" />
            <span v-else class="avatar-letter">{{ (staff.name || staff.nickname || staff.email).charAt(0).toUpperCase() }}</span>
          </div>
          <div class="card-identity">
            <h4 class="staff-name-link" @click="openProfileModal(staff)">{{ staff.name || staff.nickname || '—' }}</h4>
            <div class="badge-row">
              <span class="role-badge" :class="(staff.role || '').toLowerCase()">{{ getRoleLabel(staff.role) }}</span>
              <span class="status-badge" :class="(staff.employmentStatus || 'ACTIVE').toLowerCase()">
                {{ t(`staffDetail.status.${staff.employmentStatus || 'ACTIVE'}`) }}
              </span>
            </div>
          </div>
          <button class="edit-fab" @click="openEditModal(staff)" title="수정">✏️</button>
        </div>

        <!-- 카드 본문 -->
        <div class="card-body">
          <div class="info-row"><span class="info-icon">📧</span><span class="info-val">{{ staff.email }}</span></div>
          <div class="info-row"><span class="info-icon">🏢</span><span class="info-val">{{ gymNames[staff.gymId || ''] || '—' }}</span></div>
          <div class="info-row"><span class="info-icon">📅</span><span class="info-val">{{ staff.joinDate || '—' }}</span></div>
        </div>

        <!-- 카드 푸터: 등록자 -->
        <div class="card-footer">
          <span class="reg-by">{{ t('staffMgt.registeredBy') }}: {{ staff.registeredByEmail || '—' }}</span>
        </div>
      </div>
    </div>

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
            <span class="loader-sm"></span> 트레이너 프로필 로딩 중...
          </div>
          <template v-else-if="viewingTrainerProfile">
            <div v-if="viewingTrainerProfile.bio" class="trainer-section">
              <div class="trainer-section-label">소개</div>
              <p class="trainer-bio">{{ viewingTrainerProfile.bio }}</p>
            </div>
            <div v-if="viewingTrainerProfile.specialties?.length" class="trainer-section">
              <div class="trainer-section-label">전문분야</div>
              <div class="tag-row">
                <span v-for="s in viewingTrainerProfile.specialties" :key="s" class="tag">{{ s }}</span>
              </div>
            </div>
            <div v-if="viewingTrainerProfile.career?.length" class="trainer-section">
              <div class="trainer-section-label">경력</div>
              <ul class="trainer-list">
                <li v-for="c in viewingTrainerProfile.career" :key="c">{{ c }}</li>
              </ul>
            </div>
            <div v-if="viewingTrainerProfile.awards?.length" class="trainer-section">
              <div class="trainer-section-label">수상이력</div>
              <ul class="trainer-list">
                <li v-for="a in viewingTrainerProfile.awards" :key="a">{{ a }}</li>
              </ul>
            </div>
          </template>
          <div v-else class="trainer-no-profile">
            아직 등록된 트레이너 프로필이 없습니다.
          </div>
        </template>

        <div class="profile-modal-footer">
          <button class="btn btn-ghost" @click="showProfileModal = false">닫기</button>
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
              <select v-model="registerForm.role" required>
                <option value="MANAGER">{{ t('staffMgt.roleManager') }}</option>
                <option value="SUB_MANAGER">{{ t('staffMgt.roleSubManager') }}</option>
                <option value="TRAINER">{{ t('staffMgt.roleTrainer') }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>{{ t('staffMgt.gymLabel') }}</label>
              <select v-model="registerForm.gymId">
                <option value="">{{ t('staffMgt.gymNone') }}</option>
                <option v-for="gym in gyms" :key="gym.id" :value="gym.id">{{ gym.name }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.joinDate') }}</label>
              <input type="date" v-model="registerForm.joinDate" />
            </div>
            <div class="form-field">
              <label>{{ t('staffDetail.status.label') }}</label>
              <select v-model="registerForm.employmentStatus">
                <option value="ACTIVE">{{ t('staffDetail.status.ACTIVE') }}</option>
                <option value="ON_LEAVE">{{ t('staffDetail.status.ON_LEAVE') }}</option>
                <option value="RESIGNED">{{ t('staffDetail.status.RESIGNED') }}</option>
              </select>
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
              <select v-model="editForm.role">
                <option value="MANAGER">{{ t('staffMgt.roleManager') }}</option>
                <option value="SUB_MANAGER">{{ t('staffMgt.roleSubManager') }}</option>
                <option value="TRAINER">{{ t('staffMgt.roleTrainer') }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>{{ t('staffMgt.gymLabel') }}</label>
              <select v-model="editForm.gymId">
                <option value="">{{ t('staffMgt.gymNone') }}</option>
                <option v-for="gym in gyms" :key="gym.id" :value="gym.id">{{ gym.name }}</option>
              </select>
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
              <select v-model="editForm.employmentStatus">
                <option value="ACTIVE">{{ t('staffDetail.status.ACTIVE') }}</option>
                <option value="ON_LEAVE">{{ t('staffDetail.status.ON_LEAVE') }}</option>
                <option value="RESIGNED">{{ t('staffDetail.status.RESIGNED') }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 등록자 읽기 전용 -->
        <div class="readonly-meta">
          <span class="meta-lbl">{{ t('staffMgt.registeredBy') }}</span>
          <span class="meta-val">{{ editingStaff?.registeredByEmail || t('common.na') }}</span>
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

const getRoleLabel = (role: string) => {
  if (role === 'MANAGER') return t('staffMgt.roleManager')
  if (role === 'SUB_MANAGER') return t('staffMgt.roleSubManager')
  if (role === 'TRAINER') return t('staffMgt.roleTrainer')
  return role
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
.toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
  flex-wrap: wrap;
}

.toolbar .filter-bar {
  flex: 1;
  min-width: 0;
  margin: 0;
}

.toolbar-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  flex-shrink: 0;
}

/* ── 필터 바 ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.875rem;
  flex-wrap: wrap;
}

.search-wrap {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.search-icon { font-size: 0.9rem; opacity: 0.6; }

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-main);
  font-size: 0.9rem;
}

.filter-chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip-select {
  padding: 0.35rem 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.82rem;
  border: 1px solid var(--border);
  background: var(--bg-dark);
  color: var(--text-main);
  cursor: pointer;
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

/* 카드 본문 */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.85rem;
}

.info-row { display: flex; gap: 0.6rem; align-items: center; }
.info-icon { width: 18px; text-align: center; font-size: 0.85rem; }
.info-val { color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 카드 푸터 */
.card-footer {
  border-top: 1px solid var(--border);
  padding-top: 0.6rem;
}

.reg-by { font-size: 0.75rem; color: var(--text-muted); }

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

/* 이름 링크 */
.staff-name-link {
  cursor: pointer;
  transition: color 0.15s;
}

.staff-name-link:hover {
  color: var(--primary);
  text-decoration: underline;
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
