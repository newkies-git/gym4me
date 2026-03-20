<template>
  <div class="container gym-mgt-wrapper">
    <PageHeader
      :title="t('gymMgt.title')"
      :subtitle="t('gymMgt.subtitle')"
      show-back
    />

    <div v-if="loading" class="glass" style="padding: 2rem; margin-top: 2rem;">{{ t('gymMgt.loadingInfo') }}</div>

    <template v-else>
      <!-- SITE ADMIN VIEW (List All Gyms) -->
      <template v-if="auth.isSiteAdmin">
        <div class="flex-between" style="margin-top: 2rem; gap: 1rem;">
          <h3>{{ t('gymMgt.allGyms') }}</h3>
          <button class="btn btn-primary btn-sm" @click="openCreateModal">{{ t('gymMgt.addGym') }}</button>
        </div>

        <div v-if="gymsList.length === 0" class="glass" style="padding: 2rem; margin-top: 1rem;">
          <p>{{ t('gymMgt.noGym') }}</p>
        </div>

        <ul v-else class="gym-list" style="margin-top: 1rem; list-style: none; padding: 0;">
          <GymCard
            v-for="g in gymsList"
            :key="g.id"
            :gym="g"
            :trainers-count="trainersMap[g.id]?.length || 0"
            :trainees-count="traineesMap[g.id]?.length || 0"
            @edit="openEditModal"
            @delete="handleDeleteGym"
            @open-trainers="openTrainersModal"
          />
        </ul>
      </template>

        <!-- MANAGER VIEW (Single Gym) -->
        <template v-else>
          <div v-if="!gym" class="glass" style="padding: 2rem; margin-top: 2rem;">
            <p>{{ t('gymMgt.noGymAssigned') }}</p>
            <div class="field" style="margin-top: 1rem;">
              <label>{{ t('gymMgt.nameLabel') }}</label>
              <input v-model="newGym.name" type="text" :placeholder="t('gymMgt.namePlaceholder')" />
            </div>
            <div class="field">
              <label>{{ t('gymMgt.locationLabel') }}</label>
              <input v-model="newGym.location" type="text" :placeholder="t('gymMgt.locationPlaceholder')" />
            </div>
            <button class="btn btn-primary" style="margin-top: 1rem;" @click="handleCreateGym">{{ t('gymMgt.createMyGym') }}</button>
          </div>

          <div v-else>
            <GymCard
              :gym="gym"
              :trainers-count="trainersMap[gym.id]?.length || 0"
              :trainees-count="traineesMap[gym.id]?.length || 0"
              @edit="openEditModal"
              @delete="handleDeleteGym"
              @open-trainers="openTrainersModal"
              style="margin-top: 2rem;"
            />

            <div style="margin-top: 1rem; display: flex; gap: 1rem;">
              <router-link
                to="/manage-trainers"
                class="btn btn-secondary"
                style="flex: 1;"
              >{{ t('gymMgt.hireManageTrainers') }}</router-link>
            </div>
          </div>
        </template>
    </template>

    <!-- Create/Edit Gym Modal -->
    <BaseModal v-model:isOpen="isModalOpen" :title="isEditing ? t('gymMgt.editGym') : t('gymMgt.addGym')" max-width="500px">
      <div class="field">
        <label>{{ t('gymMgt.nameLabel') }} *</label>
        <input v-model="modalGym.name" type="text" :placeholder="t('gymMgt.namePlaceholder')" />
      </div>
      <div class="field">
        <label>{{ t('gymMgt.locationLabel') }}</label>
        <input v-model="modalGym.location" type="text" :placeholder="t('gymMgt.locationPlaceholder')" />
      </div>
      <div class="field">
        <label>{{ t('gymMgt.phoneLabel') }}</label>
        <input v-model="modalGym.phone" type="text" :placeholder="t('gymMgt.phonePlaceholder')" />
      </div>
      <div class="field">
        <label>{{ t('gymMgt.openDateLabel') }}</label>
        <input v-model="modalGym.openDate" type="date" />
      </div>
      <div class="field" v-if="auth.isSiteAdmin">
        <label>{{ t('gymMgt.managerLabel') }}</label>
        <input v-model="modalGym.managerEmail" type="email" :placeholder="t('gymMgt.managerPlaceholder')" />
      </div>
      <div class="field">
        <label>{{ t('gymMgt.notesLabel') }}</label>
        <textarea v-model="modalGym.notes" :placeholder="t('gymMgt.notesPlaceholder')" rows="3"></textarea>
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="isModalOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="handleSaveGym" :disabled="saving">
          {{ saving ? t('common.processing') : t('common.save') }}
        </button>
      </template>
    </BaseModal>

    <!-- Trainers List Modal -->
    <BaseModal v-model:isOpen="isTrainersModalOpen" :title="t('gymMgt.trainerList')" max-width="400px">
      <div v-if="!selectedGymTrainers.length" class="trainers-modal-empty">
        {{ t('gymMgt.emptyTrainers') }}
      </div>
      <ul v-else class="trainers-modal-list">
        <li v-for="tr in selectedGymTrainers" :key="tr.id || tr.uid" class="trainers-modal-item" @click="openProfileModal(tr)">
          <div class="trainers-modal-item-header">
            <span class="trainers-modal-item-name">{{ tr.nickname || tr.email || tr.data?.nickname || tr.data?.email }}</span>
            <span class="trainers-modal-item-badge" :class="(tr.role || tr.data?.role || '').toLowerCase()">
              {{ tr.role || tr.data?.role }}
            </span>
          </div>
          <p class="trainers-modal-item-meta">
            Lv.{{ tr.lvl ?? tr.data?.lvl ?? '—' }}
          </p>
          <p class="trainers-modal-item-email">{{ tr.email || tr.data?.email }}</p>
        </li>
      </ul>
      <template #footer>
        <button class="btn btn-primary btn-sm" @click="isTrainersModalOpen = false">{{ t('common.close') }}</button>
      </template>
    </BaseModal>

    <!-- ── Trainer Profile Detail Modal ── -->
    <BaseModal
      v-model:isOpen="showProfileModal"
      :title="(viewingStaff as any)?.name || (viewingStaff as any)?.nickname || (viewingStaff as any)?.email || ''"
      max-width="480px"
    >
      <div v-if="viewingStaff" class="profile-modal">
        <!-- Hero Header -->
        <div class="profile-hero">
          <div class="profile-avatar-lg" :class="(viewingStaff.role || '').toLowerCase()">
            <img v-if="viewingTrainerProfile?.photoUrl" :src="viewingTrainerProfile.photoUrl" alt="Profile" />
            <img v-else-if="viewingStaff.profileImageUrl" :src="viewingStaff.profileImageUrl" alt="Profile" />
            <span v-else>{{ ((viewingStaff.name || viewingStaff.nickname || viewingStaff.email) || '').charAt(0).toUpperCase() }}</span>
          </div>
          <div class="profile-hero-info">
            <h3>{{ viewingStaff.name || viewingStaff.nickname || '—' }}</h3>
            <p class="profile-nickname" v-if="viewingStaff.nickname">@{{ viewingStaff.nickname }}</p>
            <div class="badge-row" style="margin-top: 0.5rem;">
              <span class="role-badge" :class="(viewingStaff.role || '').toLowerCase()">{{ viewingStaff.role }}</span>
            </div>
          </div>
        </div>

        <!-- Trainer Profile Sections -->
        <div v-if="loadingTrainerProfile" class="trainer-loading">
          <span class="loader-sm"></span> {{ t('common.loading') }}...
        </div>
        <template v-else-if="viewingTrainerProfile">
          <!-- Bio -->
          <div v-if="viewingTrainerProfile.bio" class="trainer-section">
            <div class="trainer-section-label">소개</div>
            <p class="trainer-bio">{{ viewingTrainerProfile.bio }}</p>
          </div>

          <!-- Specialties -->
          <div v-if="viewingTrainerProfile.specialties?.length" class="trainer-section">
            <div class="trainer-section-label">전문분야</div>
            <div class="tag-row">
              <span v-for="s in viewingTrainerProfile.specialties" :key="s" class="tag">{{ s }}</span>
            </div>
          </div>

          <!-- Career -->
          <div v-if="viewingTrainerProfile.career?.length" class="trainer-section">
            <div class="trainer-section-label">경력</div>
            <ul class="trainer-list">
              <li v-for="c in viewingTrainerProfile.career" :key="c">{{ c }}</li>
            </ul>
          </div>

          <!-- Awards -->
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

        <div class="profile-modal-footer" style="margin-top: 1.5rem; justify-content: flex-end; display: flex;">
          <button class="btn btn-ghost" @click="closeProfileModal">{{ t('common.close') }}</button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import GymCard from '../components/gym/GymCard.vue'
import { useGymManagement } from '../composables/gym/useGymManagement'

const { t } = useI18n()
const auth = useAuthStore()

const {
  loading,
  gym,
  gymsList,
  traineesMap,
  trainersMap,
  isModalOpen,
  isEditing,
  modalGym,
  saving,
  isTrainersModalOpen,
  selectedGymTrainers,
  showProfileModal,
  viewingStaff,
  viewingTrainerProfile,
  loadingTrainerProfile,
  newGym,
  openCreateModal,
  openEditModal,
  openTrainersModal,
  openProfileModal,
  handleSaveGym,
  handleDeleteGym,
  handleCreateGym,
  closeProfileModal
} = useGymManagement()
</script>

<style scoped>
.gym-mgt-wrapper { 
  padding: 6rem 1rem 2rem 1rem; 
}
.sm-text { color: var(--text-muted); font-size: 0.9rem; }

.clickable-count {
  text-decoration: underline;
  cursor: pointer;
  transition: opacity 0.2s;
}
.clickable-count:hover {
  opacity: 0.7;
}

/* --- Trainer Profile Popup Styles --- */
.trainer-name-link {
  cursor: pointer;
  transition: color 0.15s;
}

.trainer-name-link:hover {
  color: var(--primary);
  text-decoration: underline;
}

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
.profile-avatar-lg.site_admin  { background: #e0f2fe; color: #0ea5e9; }

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

/* ── Trainers List Modal ── */
.trainers-modal-empty {
  padding: 1.5rem 0;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.trainers-modal-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.trainers-modal-item {
  padding: 1rem 1.25rem;
  background: var(--bg-dark, rgba(0, 0, 0, 0.03));
  border-radius: 0.75rem;
  border: 1px solid var(--border, rgba(0, 0, 0, 0.08));
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.trainers-modal-item:hover {
  background: rgba(94, 53, 177, 0.06);
  border-color: rgba(94, 53, 177, 0.2);
  box-shadow: 0 2px 8px rgba(94, 53, 177, 0.08);
}

.trainers-modal-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.trainers-modal-item-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-primary, #1a1a1a);
}

.trainers-modal-item-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 100px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.trainers-modal-item-badge.manager,
.trainers-modal-item-badge.site_admin {
  background: #ede9fe;
  color: #5e35b1;
}

.trainers-modal-item-badge.trainer {
  background: #e0f2fe;
  color: #0369a1;
}

.trainers-modal-item-badge:not(.manager):not(.site_admin):not(.trainer) {
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-muted);
}

.trainers-modal-item-meta {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.trainers-modal-item-email {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
  word-break: break-all;
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

@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.trainer-no-profile {
  border-top: 1px solid var(--border);
  padding-top: 1rem;
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-style: italic;
}
</style>
