<template>
  <div class="management-wrapper container">
    <PageHeader :title="t('trainerMgt.title')" show-back />

    <div class="grid-2" style="margin-top: 2rem;">
      <!-- Trainer List Section -->
      <div class="list-section glass">
        <div class="flex-between" style="margin-bottom: 1rem;">
          <h3 style="margin: 0;">{{ t('trainerMgt.currentTrainers') }}</h3>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <div v-if="auth.isSupervisor" style="display: flex; gap: 0.5rem; align-items: center;">
              <input type="text" v-model="filterGymId" :placeholder="t('trainerMgt.filterByGymId')" class="field" style="margin: 0; padding: 0.25rem 0.5rem; font-size: 0.85rem;" @keyup.enter="fetchTrainers" />
              <button class="btn btn-primary btn-sm" @click="fetchTrainers">{{ t('search.searchBtn') }}</button>
            </div>
            <button class="btn btn-ghost btn-sm" @click="showDeleted = !showDeleted">
              {{ showDeleted ? t('trainerMgt.hideDeleted') : t('trainerMgt.showDeleted') }}
            </button>
          </div>
        </div>
        <div v-if="loading" class="sm-text">{{ t('trainerMgt.loading') }}</div>
        <ul v-else class="history-list">
          <li v-for="trainer in visibleTrainers" :key="trainer.uid" class="history-item flex-between" style="flex-direction: row; align-items: center;">
            <div>
              <div style="font-weight: 600;">{{ trainer.nickname || t('trainerMgt.noNickname') }}</div>
              <div class="sm-text">{{ trainer.email }}</div>
              <div class="sm-text" v-if="trainer.gymId">{{ t('trainerMgt.gymInfo', { gymId: trainer.gymId }) }}</div>
            </div>
            <div class="actions">
              <button class="btn btn-ghost btn-sm" @click="openEditModal(trainer)">{{ t('trainerMgt.editTrainer') }}</button>
              <button
                v-if="!trainer.deletedFlag"
                class="btn btn-ghost btn-sm"
                @click="softDeleteTrainer(trainer)"
              >
                {{ t('trainerMgt.flagDelete') }}
              </button>
              <button
                v-else
                class="btn btn-ghost btn-sm"
                @click="restoreTrainer(trainer)"
              >
                {{ t('trainerMgt.restoreTrainer') }}
              </button>
              <button
                v-if="trainer.deletedFlag"
                class="btn btn-danger btn-sm"
                @click="hardDeleteTrainer(trainer)"
              >
                {{ t('trainerMgt.hardDelete') }}
              </button>
            </div>
          </li>
        </ul>
        <div v-if="!loading && visibleTrainers.length === 0" class="empty-state">{{ t('trainerMgt.noTrainers') }}</div>
      </div>

      <!-- Add Trainer Section -->
      <div class="add-section glass">
        <h3>{{ t('trainerMgt.appointTitle') }}</h3>
        <p class="sm-text">{{ t('trainerMgt.appointDesc') }}</p>
        
        <div class="field" style="margin-top: 1.5rem;">
          <input type="email" v-model="searchEmail" :placeholder="t('trainerMgt.invitePlaceholder')" @keyup.enter="searchUser">
        </div>
        <button class="btn btn-primary" style="width: 100%;" @click="searchUser" :disabled="searching">
          {{ searching ? t('trainerMgt.searching') : t('trainerMgt.searchUser') }}
        </button>

        <div v-if="foundUser" class="found-user-card" style="margin-top: 2rem; padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem;">
          <p><strong>{{ t('trainerMgt.found') }}</strong> {{ foundUser.data.nickname || foundUser.data.email }}</p>
          <p class="sm-text">{{ t('trainerMgt.currentLevel', { lvl: foundUser.data.lvl }) }}</p>
          
          <div v-if="auth.isSupervisor" class="field" style="margin-top: 1rem;">
            <label>{{ t('trainerMgt.assignGymIdLabel') }}</label>
            <input type="text" v-model="assignGymId" :placeholder="t('trainerMgt.assignGymIdPlaceholder')" />
          </div>

          <button class="btn btn-primary btn-sm" style="margin-top: 1rem; width: 100%;" @click="promoteUser">
            {{ t('trainerMgt.appointAsTrainer') }}
          </button>
        </div>
        <p v-else-if="searchPerformed && !foundUser" class="error-text" style="margin-top: 1rem;">{{ t('trainerMgt.userNotFound') }}</p>
      </div>
    </div>

    <BaseModal v-model:isOpen="editModalOpen" :title="t('trainerMgt.editTrainer')" max-width="460px">
      <div class="field">
        <label>{{ t('trainerMgt.nicknameLabel') }}</label>
        <input v-model="editForm.nickname" type="text" :placeholder="t('trainerMgt.nicknamePlaceholder')" />
      </div>
      <div class="field" v-if="auth.isSupervisor">
        <label>{{ t('trainerMgt.gymIdLabel') }}</label>
        <input v-model="editForm.gymId" type="text" :placeholder="t('trainerMgt.gymIdPlaceholder')" />
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="editModalOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="saveTrainerEdit" :disabled="savingEdit">{{ t('common.save') }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import { getTrainers, searchUserByEmail, updateTrainerRole, updateTrainerInfo, setTrainerDeletedFlagWithAudit, deleteTrainerCompletelyWithAudit } from '../services/firebaseService'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'

const router = useRouter()
const auth = useAuthStore()
const ui = useUIStore()
const { t } = useI18n()

const trainers = ref<any[]>([])
const loading = ref(false)

const searchEmail = ref('')
const searching = ref(false)
const foundUser = ref<any>(null)
const searchPerformed = ref(false)
const showDeleted = ref(false)
const filterGymId = ref('')
const assignGymId = ref('')

const editModalOpen = ref(false)
const savingEdit = ref(false)
const editingTrainer = ref<any>(null)
const editForm = ref({
  nickname: '',
  gymId: ''
})

const visibleTrainers = computed(() => trainers.value.filter((tItem) => showDeleted.value ? tItem.deletedFlag : !tItem.deletedFlag))

onMounted(fetchTrainers)

async function fetchTrainers() {
  loading.value = true
  try {
    const queryGymId = auth.isSupervisor ? filterGymId.value.trim() || undefined : auth.user?.gymId
    trainers.value = await getTrainers(queryGymId, true)
  } catch (e: any) {
    ui.showToast(t('trainerMgt.fetchFailed') + ': ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function searchUser() {
  if (!searchEmail.value) return
  searching.value = true
  searchPerformed.value = false
  foundUser.value = null
  try {
    foundUser.value = await searchUserByEmail(searchEmail.value)
    searchPerformed.value = true
  } catch (e: any) {
    ui.showToast(t('trainerMgt.searchFailed') + ': ' + e.message, 'error')
  } finally {
    searching.value = false
  }
}

async function promoteUser() {
  if (!foundUser.value) return
  
  let targetGymId = auth.user?.gymId
  if (auth.isSupervisor) {
    targetGymId = assignGymId.value.trim()
  }

  if (!targetGymId && !auth.isSupervisor) {
    ui.showToast(t('trainerMgt.gymRequired'), 'warning')
    return
  }
  try {
    // If site admin is promoting, they might not have a gymId, but site admin promoteToManager is separate.
    // Managers promote trainers to THEIR gym.
    await updateTrainerRole(foundUser.value.id, 'TRAINER', 10, targetGymId, {
      actorEmail: auth.user?.email || '',
      action: 'TRAINER_PROMOTE',
      targetUid: foundUser.value.id,
      targetEmail: foundUser.value.data.email,
      metadata: { gymId: targetGymId || null }
    })
    ui.showToast(t('trainerMgt.promoteSuccess'), 'success')
    foundUser.value = null
    searchEmail.value = ''
    assignGymId.value = ''
    searchPerformed.value = false
    fetchTrainers()
  } catch (e: any) {
    ui.showToast(t('trainerMgt.promoteFailed') + ': ' + e.message, 'error')
  }
}

function openEditModal(trainer: any) {
  editingTrainer.value = trainer
  editForm.value = {
    nickname: trainer.nickname || '',
    gymId: trainer.gymId || ''
  }
  editModalOpen.value = true
}

async function saveTrainerEdit() {
  if (!editingTrainer.value) return
  savingEdit.value = true
  try {
    const updates: { nickname?: string; gymId?: string } = {}
    updates.nickname = editForm.value.nickname.trim()
    if (auth.isSupervisor) {
      updates.gymId = editForm.value.gymId.trim() || undefined
    }
    await updateTrainerInfo(editingTrainer.value.uid, updates)
    ui.showToast(t('trainerMgt.editSuccess'), 'success')
    editModalOpen.value = false
    await fetchTrainers()
  } catch (e: any) {
    ui.showToast(t('trainerMgt.editFailed') + ': ' + e.message, 'error')
  } finally {
    savingEdit.value = false
  }
}

async function softDeleteTrainer(trainer: any) {
  if (!confirm(t('trainerMgt.confirmFlagDelete', { email: trainer.email }))) return
  try {
    await setTrainerDeletedFlagWithAudit(trainer.uid, true, {
      actorEmail: auth.user?.email || '',
      action: 'TRAINER_FLAG_DELETE',
      targetUid: trainer.uid,
      targetEmail: trainer.email
    })
    ui.showToast(t('trainerMgt.flagDeleteSuccess'), 'warning')
    await fetchTrainers()
  } catch (e: any) {
    ui.showToast(t('trainerMgt.flagDeleteFailed') + ': ' + e.message, 'error')
  }
}

async function restoreTrainer(trainer: any) {
  try {
    await setTrainerDeletedFlagWithAudit(trainer.uid, false, {
      actorEmail: auth.user?.email || '',
      action: 'TRAINER_RESTORE',
      targetUid: trainer.uid,
      targetEmail: trainer.email
    })
    ui.showToast(t('trainerMgt.restoreSuccess'), 'success')
    await fetchTrainers()
  } catch (e: any) {
    ui.showToast(t('trainerMgt.restoreFailed') + ': ' + e.message, 'error')
  }
}

async function hardDeleteTrainer(trainer: any) {
  if (!confirm(t('trainerMgt.confirmHardDelete', { email: trainer.email }))) return
  try {
    await deleteTrainerCompletelyWithAudit(trainer.uid, {
      actorEmail: auth.user?.email || '',
      action: 'TRAINER_HARD_DELETE',
      targetUid: trainer.uid,
      targetEmail: trainer.email
    })
    ui.showToast(t('trainerMgt.hardDeleteSuccess'), 'error')
    await fetchTrainers()
  } catch (e: any) {
    ui.showToast(t('trainerMgt.hardDeleteFailed') + ': ' + e.message, 'error')
  }
}
</script>

<style scoped>
.management-wrapper { padding: 6rem 1rem 2rem 1rem; }
.header { margin-bottom: 2rem; }
.list-section, .add-section { padding: 1.5rem; }
h3 { margin-bottom: 1.5rem; }
.sm-text { font-size: 0.85rem; color: var(--text-muted); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }
.history-item { padding: 1rem; flex-direction: column; align-items: stretch; gap: 1rem; }
.actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }

@media (min-width: 641px) {
  .history-item { flex-direction: row; justify-content: space-between; align-items: center; }
  .list-section, .add-section { padding: 2rem; }
}
</style>
