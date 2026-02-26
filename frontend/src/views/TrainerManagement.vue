<template>
  <div class="management-wrapper container">
    <div class="header flex-between">
      <h2>{{ t('trainerMgt.title') }}</h2>
      <button class="btn btn-ghost" @click="router.back()">{{ t('trainerMgt.back') }}</button>
    </div>

    <div class="grid-2" style="margin-top: 2rem;">
      <!-- Trainer List Section -->
      <div class="list-section glass">
        <h3>{{ t('trainerMgt.currentTrainers') }}</h3>
        <div v-if="loading" class="sm-text">{{ t('trainerMgt.loading') }}</div>
        <ul v-else class="history-list">
          <li v-for="trainer in trainers" :key="trainer.uid" class="history-item flex-between" style="flex-direction: row; align-items: center;">
            <div>
              <div style="font-weight: 600;">{{ trainer.nickname || t('trainerMgt.noNickname') }}</div>
              <div class="sm-text">{{ trainer.email }}</div>
            </div>
            <div class="actions">
               <button class="btn btn-ghost btn-sm" @click="demoteUser(trainer)">{{ t('trainerMgt.demoteToMember') }}</button>
            </div>
          </li>
        </ul>
        <div v-if="!loading && trainers.length === 0" class="empty-state">{{ t('trainerMgt.noTrainers') }}</div>
      </div>

      <!-- Add Trainer Section -->
      <div class="add-section glass">
        <h3>{{ t('trainerMgt.appointTitle') }}</h3>
        <p class="sm-text">{{ t('trainerMgt.appointDesc') }}</p>
        
        <div class="field" style="margin-top: 1.5rem;">
          <input type="email" v-model="searchEmail" placeholder="user@example.com" @keyup.enter="searchUser">
        </div>
        <button class="btn btn-primary" style="width: 100%;" @click="searchUser" :disabled="searching">
          {{ searching ? t('trainerMgt.searching') : t('trainerMgt.searchUser') }}
        </button>

        <div v-if="foundUser" class="found-user-card" style="margin-top: 2rem; padding: 1rem; border: 1px solid var(--border); border-radius: 0.5rem;">
          <p><strong>{{ t('trainerMgt.found') }}</strong> {{ foundUser.data.nickname || foundUser.data.email }}</p>
          <p class="sm-text">{{ t('trainerMgt.currentLevel', { lvl: foundUser.data.lvl }) }}</p>
          <button class="btn btn-primary btn-sm" style="margin-top: 1rem; width: 100%;" @click="promoteUser">
            {{ t('trainerMgt.appointAsTrainer') }}
          </button>
        </div>
        <p v-else-if="searchPerformed && !foundUser" class="error-text" style="margin-top: 1rem;">{{ t('trainerMgt.userNotFound') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getTrainers, searchUserByEmail, updateTrainerRole } from '../services/firebaseService'
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

onMounted(fetchTrainers)

async function fetchTrainers() {
  loading.value = true
  try {
    trainers.value = await getTrainers(auth.user?.gymId)
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
  if (!auth.user?.gymId && !auth.isSiteAdmin) {
    ui.showToast(t('trainerMgt.gymRequired'), 'warning')
    return
  }
  try {
    // If site admin is promoting, they might not have a gymId, but site admin promoteToManager is separate.
    // Managers promote trainers to THEIR gym.
    await updateTrainerRole(foundUser.value.id, 'TRAINER', 10, auth.user?.gymId)
    ui.showToast(t('trainerMgt.promoteSuccess'), 'success')
    foundUser.value = null
    searchEmail.value = ''
    searchPerformed.value = false
    fetchTrainers()
  } catch (e: any) {
    ui.showToast(t('trainerMgt.promoteFailed') + ': ' + e.message, 'error')
  }
}

async function demoteUser(trainer: any) {
  if (!confirm(t('trainerMgt.confirmDemoteToMember', { email: trainer.email }))) return
  try {
    await updateTrainerRole(trainer.uid, 'MEMBER', 5)
    ui.showToast(t('trainerMgt.demoteSuccess'), 'info')
    fetchTrainers()
  } catch (e: any) {
    ui.showToast(t('trainerMgt.demoteFailed') + ': ' + e.message, 'error')
  }
}
</script>

<style scoped>
.management-wrapper { padding: 1rem 0; }
.header { margin-bottom: 2rem; }
.list-section, .add-section { padding: 2rem; }
h3 { margin-bottom: 1.5rem; }
.sm-text { font-size: 0.85rem; color: var(--text-muted); }
.empty-state { color: var(--text-muted); font-style: italic; padding: 1rem 0; }
.history-item { padding: 1rem; }
</style>
