<template>
  <div class="management-wrapper container">
    <div class="header flex-between">
      <div>
        <h2>{{ t('managerMgt.pageTitle') }}</h2>
        <p class="sm-text">{{ t('managerMgt.ruleSummary') }}</p>
      </div>
    </div>

    <div class="field gym-filter">
      <label>{{ t('managerMgt.gymIdLabel') }}</label>
      <input v-model="selectedGymId" type="text" :placeholder="t('managerMgt.gymIdPlaceholder')" @keyup.enter="refreshAll" />
      <button class="btn btn-ghost btn-sm" @click="refreshAll">{{ t('common.refresh') }}</button>
    </div>

    <div class="grid-2" style="margin-top: 1.5rem;">
      <div class="list-section glass">
        <div class="flex-between" style="margin-bottom: 1rem;">
          <h3 style="margin: 0;">{{ t('managerMgt.currentManagers') }}</h3>
          <button class="btn btn-ghost btn-sm" @click="showDeleted = !showDeleted">
            {{ showDeleted ? t('managerMgt.hideDeleted') : t('managerMgt.showDeleted') }}
          </button>
        </div>

        <div v-if="loading" class="sm-text">{{ t('managerMgt.loading') }}</div>
        <ul v-else class="history-list">
          <li v-for="manager in visibleManagers" :key="manager.uid" class="history-item manager-item">
            <div>
              <div style="font-weight: 700;">
                {{ manager.nickname || t('managerMgt.noNickname') }}
                <span v-if="manager.managerType === 'PRIMARY'" class="badge badge-primary">{{ t('managerMgt.primary') }}</span>
                <span v-else class="badge">{{ t('managerMgt.vice') }}</span>
              </div>
              <div class="sm-text">{{ manager.email }}</div>
              <div class="sm-text">{{ t('managerMgt.gymInfo', { gymId: manager.gymId || '-' }) }}</div>
            </div>
            <div class="actions">
              <button class="btn btn-ghost btn-sm" @click="openEditModal(manager)">{{ t('managerMgt.editManager') }}</button>
              <button class="btn btn-ghost btn-sm" @click="demoteManager(manager)">{{ t('managerMgt.demote') }}</button>
              <button v-if="!manager.deletedFlag" class="btn btn-ghost btn-sm" @click="softDeleteManager(manager)">
                {{ t('managerMgt.flagDelete') }}
              </button>
              <button v-else class="btn btn-ghost btn-sm" @click="restoreManager(manager)">
                {{ t('managerMgt.restore') }}
              </button>
              <button v-if="manager.deletedFlag" class="btn btn-danger btn-sm" @click="hardDeleteManager(manager)">
                {{ t('managerMgt.hardDelete') }}
              </button>
            </div>
          </li>
        </ul>
        <div v-if="!loading && visibleManagers.length === 0" class="empty-state">{{ t('managerMgt.noManagers') }}</div>
      </div>

      <div class="add-section glass">
        <h3>{{ t('managerMgt.assignTitle') }}</h3>
        <p class="sm-text">{{ t('managerMgt.assignDesc') }}</p>

        <div class="field" style="margin-top: 1rem;">
          <label>{{ t('managerMgt.emailLabel') }}</label>
          <input v-model="targetEmail" type="email" :placeholder="t('managerMgt.emailPlaceholder')" />
        </div>

        <div class="field">
          <label>{{ t('managerMgt.managerTypeLabel') }}</label>
          <select v-model="selectedManagerType">
            <option value="PRIMARY">{{ t('managerMgt.primary') }}</option>
            <option value="VICE">{{ t('managerMgt.vice') }}</option>
          </select>
        </div>

        <button class="btn btn-primary" style="width: 100%;" :disabled="saving" @click="assignManager">
          {{ t('managerMgt.assignBtn') }}
        </button>

        <div class="candidate-wrap">
          <div class="sm-text" style="margin-bottom: 0.5rem;">{{ t('managerMgt.candidates') }}</div>
          <ul class="history-list candidate-list">
            <li v-for="trainer in filteredCandidates" :key="trainer.uid" class="history-item candidate-item">
              <button class="candidate-btn" @click="targetEmail = trainer.email">
                <strong>{{ trainer.nickname || t('managerMgt.noNickname') }}</strong>
                <span class="sm-text">{{ trainer.email }}</span>
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <BaseModal v-model:isOpen="editModalOpen" :title="t('managerMgt.editManager')" max-width="460px">
      <div class="field">
        <label>{{ t('managerMgt.nicknameLabel') }}</label>
        <input v-model="editForm.nickname" type="text" :placeholder="t('managerMgt.nicknamePlaceholder')" />
      </div>
      <div class="field">
        <label>{{ t('managerMgt.gymIdLabel') }}</label>
        <input v-model="editForm.gymId" type="text" :placeholder="t('managerMgt.gymIdPlaceholder')" />
      </div>
      <div class="field">
        <label>{{ t('managerMgt.managerTypeLabel') }}</label>
        <select v-model="editForm.managerType">
          <option value="PRIMARY">{{ t('managerMgt.primary') }}</option>
          <option value="VICE">{{ t('managerMgt.vice') }}</option>
        </select>
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="editModalOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="savingEdit" @click="saveManagerEdit">{{ t('common.save') }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '../components/ui/BaseModal.vue'
import { assignManagerFromTrainer, deleteManagerCompletely, demoteManagerToTrainer, getManagerCandidates, getManagers, setManagerDeletedFlag, type ManagerType, updateManagerInfo } from '../services/firebaseService'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'

const auth = useAuthStore()
const ui = useUIStore()
const { t } = useI18n()

const loading = ref(false)
const saving = ref(false)
const showDeleted = ref(false)
const managers = ref<any[]>([])
const candidates = ref<any[]>([])

const selectedGymId = ref(auth.user?.gymId || '')
const targetEmail = ref('')
const selectedManagerType = ref<ManagerType>('VICE')

const editModalOpen = ref(false)
const savingEdit = ref(false)
const editingManager = ref<any>(null)
const editForm = ref<{ nickname: string; gymId: string; managerType: ManagerType }>({
  nickname: '',
  gymId: '',
  managerType: 'VICE'
})

const visibleManagers = computed(() => managers.value.filter((m) => showDeleted.value ? m.deletedFlag : !m.deletedFlag))
const filteredCandidates = computed(() => {
  const keyword = targetEmail.value.trim().toLowerCase()
  if (!keyword) return candidates.value
  return candidates.value.filter((c) => (c.email || '').toLowerCase().includes(keyword))
})

onMounted(refreshAll)

async function refreshAll() {
  if (!selectedGymId.value.trim()) {
    managers.value = []
    candidates.value = []
    return
  }

  loading.value = true
  try {
    const gymId = selectedGymId.value.trim()
    managers.value = await getManagers(gymId, true)
    candidates.value = await getManagerCandidates(gymId)
  } catch (e: any) {
    ui.showToast(`${t('managerMgt.loadFailed')}: ${e.message}`, 'error')
  } finally {
    loading.value = false
  }
}

async function assignManager() {
  const gymId = selectedGymId.value.trim()
  const email = targetEmail.value.trim().toLowerCase()
  if (!gymId) {
    ui.showToast(t('managerMgt.gymRequired'), 'warning')
    return
  }
  if (!email) return

  const targetTrainer = candidates.value.find((c) => (c.email || '').toLowerCase() === email)
  if (!targetTrainer) {
    ui.showToast(t('managerMgt.trainerOnly'), 'warning')
    return
  }

  saving.value = true
  try {
    await assignManagerFromTrainer(targetTrainer.uid, gymId, selectedManagerType.value)
    ui.showToast(t('managerMgt.assignSuccess', { email }), 'success')
    if (selectedManagerType.value === 'PRIMARY') {
      ui.showToast(t('managerMgt.primaryUniqueHint'), 'info')
    }
    targetEmail.value = ''
    await refreshAll()
  } catch (e: any) {
    ui.showToast(`${t('managerMgt.assignFailed')}: ${e.message}`, 'error')
  } finally {
    saving.value = false
  }
}

function openEditModal(manager: any) {
  editingManager.value = manager
  editForm.value = {
    nickname: manager.nickname || '',
    gymId: manager.gymId || selectedGymId.value || '',
    managerType: manager.managerType === 'PRIMARY' ? 'PRIMARY' : 'VICE'
  }
  editModalOpen.value = true
}

async function saveManagerEdit() {
  if (!editingManager.value) return
  savingEdit.value = true
  try {
    await updateManagerInfo(editingManager.value.uid, {
      nickname: editForm.value.nickname.trim(),
      gymId: editForm.value.gymId.trim(),
      managerType: editForm.value.managerType
    })
    ui.showToast(t('managerMgt.editSuccess'), 'success')
    editModalOpen.value = false
    await refreshAll()
  } catch (e: any) {
    ui.showToast(`${t('managerMgt.editFailed')}: ${e.message}`, 'error')
  } finally {
    savingEdit.value = false
  }
}

async function demoteManager(manager: any) {
  if (!confirm(t('managerMgt.confirmDemote', { email: manager.email }))) return
  try {
    await demoteManagerToTrainer(manager.uid)
    ui.showToast(t('managerMgt.demoteSuccess'), 'success')
    await refreshAll()
  } catch (e: any) {
    ui.showToast(`${t('managerMgt.demoteFailed')}: ${e.message}`, 'error')
  }
}

async function softDeleteManager(manager: any) {
  if (!confirm(t('managerMgt.confirmFlagDelete', { email: manager.email }))) return
  try {
    await setManagerDeletedFlag(manager.uid, true)
    ui.showToast(t('managerMgt.flagDeleteSuccess'), 'warning')
    await refreshAll()
  } catch (e: any) {
    ui.showToast(`${t('managerMgt.flagDeleteFailed')}: ${e.message}`, 'error')
  }
}

async function restoreManager(manager: any) {
  try {
    await setManagerDeletedFlag(manager.uid, false)
    ui.showToast(t('managerMgt.restoreSuccess'), 'success')
    await refreshAll()
  } catch (e: any) {
    ui.showToast(`${t('managerMgt.restoreFailed')}: ${e.message}`, 'error')
  }
}

async function hardDeleteManager(manager: any) {
  if (!confirm(t('managerMgt.confirmHardDelete', { email: manager.email }))) return
  try {
    await deleteManagerCompletely(manager.uid)
    ui.showToast(t('managerMgt.hardDeleteSuccess'), 'error')
    await refreshAll()
  } catch (e: any) {
    ui.showToast(`${t('managerMgt.hardDeleteFailed')}: ${e.message}`, 'error')
  }
}
</script>

<style scoped>
.management-wrapper { padding: 1rem 0; }
.header { margin-bottom: 1rem; }
.sm-text { font-size: 0.85rem; color: var(--text-muted); margin: 0.35rem 0 0; }
.gym-filter {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.75rem;
  align-items: end;
}
.list-section, .add-section { padding: 1.5rem; }
.manager-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  font-size: 0.7rem;
  color: var(--text-muted);
}
.badge-primary {
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}
.candidate-wrap { margin-top: 1.25rem; }
.candidate-list { max-height: 280px; overflow-y: auto; }
.candidate-item { padding: 0; }
.candidate-btn {
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  color: inherit;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
}
.candidate-btn:hover { background: rgba(255, 255, 255, 0.04); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }
@media (max-width: 900px) {
  .gym-filter { grid-template-columns: 1fr; }
}
</style>
