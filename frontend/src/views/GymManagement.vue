<template>
  <div class="container gym-mgt-wrapper">
    <div class="header page-header">
      <h2>{{ t('gymMgt.title') }}</h2>
      <p class="sm-text">{{ t('gymMgt.subtitle') }}</p>
    </div>

    <div v-if="loading" class="glass" style="padding: 2rem; margin-top: 2rem;">{{ t('gymMgt.loadingInfo') }}</div>

    <!-- SITE ADMIN VIEW (List All Gyms) -->
    <template v-else-if="auth.isSiteAdmin">
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
          :members-count="membersMap[g.id]?.length || 0"
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
          :members-count="membersMap[gym.id]?.length || 0"
          @edit="openEditModal"
          @delete="handleDeleteGym"
          @open-trainers="openTrainersModal"
          style="margin-top: 2rem;"
        />
        
        <div style="margin-top: 1rem; display: flex; gap: 1rem;">
          <router-link to="/manage-trainers" class="btn btn-secondary" style="flex: 1;">{{ t('gymMgt.hireManageTrainers') }}</router-link>
        </div>
      </div>
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
      <div v-if="!selectedGymTrainers.length" class="sm-text" style="padding: 1rem 0;">
        {{ t('gymMgt.emptyTrainers') }}
      </div>
      <ul v-else class="gym-list" style="list-style: none; padding: 0; margin-top: 1rem;">
        <li v-for="tr in selectedGymTrainers" :key="tr.id || tr.uid" class="glass gym-item" style="padding: 1rem; margin-bottom: 0.5rem; flex-direction: column; align-items: flex-start;">
          <h4 style="margin: 0 0 0.2rem 0;">{{ tr.nickname || tr.email || tr.data?.nickname || tr.data?.email }}</h4>
          <p class="sm-text" style="margin: 0; font-size: 0.8rem;">
            Role: {{ tr.role || tr.data?.role }} | Lvl: {{ tr.lvl || tr.data?.lvl }}
          </p>
          <p class="sm-text" style="margin: 0; font-size: 0.8rem;">
            {{ tr.email || tr.data?.email }}
          </p>
        </li>
      </ul>
      <template #footer>
        <button class="btn btn-ghost" @click="isTrainersModalOpen = false">{{ t('common.close') }}</button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { useUIStore } from '../stores/uiStore'
import BaseModal from '../components/ui/BaseModal.vue'
import GymCard from '../components/gym/GymCard.vue'
import { getGyms, createGym, updateGym, deleteGym, getGymMembers, getTrainers } from '../services/firebaseService'
import type { Gym } from '../types'

const auth = useAuthStore()
const ui = useUIStore()
const { t } = useI18n()

const loading = ref(true)
const gym = ref<Gym | null>(null)
const gymsList = ref<Gym[]>([])

// Store member and trainer arrays per gym id
const membersMap = ref<Record<string, any[]>>({})
const trainersMap = ref<Record<string, any[]>>({})

const isTrainersModalOpen = ref(false)
const selectedGymTrainers = ref<any[]>([])

const newGym = reactive({
  name: '',
  location: ''
})

const isModalOpen = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const modalGym = reactive({
  id: '',
  name: '',
  location: '',
  phone: '',
  openDate: '',
  notes: '',
  managerEmail: ''
})

onMounted(fetchGymsData)

async function fetchGymsData() {
  loading.value = true
  try {
    const gyms = await getGyms()
    gymsList.value = gyms
    gym.value = gyms.find(g => g.id === auth.user?.gymId) || null
    
    // Fetch arrays for all visible gyms
    const gymsToCount = auth.isSiteAdmin ? gymsList.value : (gym.value ? [gym.value] : [])
    for (const g of gymsToCount) {
      if (!g.id) continue
      const [members, trainers] = await Promise.all([
        getGymMembers(g.id),
        getTrainers(g.id)
      ])
      membersMap.value[g.id] = members
      trainersMap.value[g.id] = trainers
    }
  } catch (e: any) {
    ui.showToast(t('gymMgt.loadError') + ': ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  isEditing.value = false
  modalGym.id = ''
  modalGym.name = ''
  modalGym.location = ''
  modalGym.phone = ''
  modalGym.openDate = ''
  modalGym.notes = ''
  // For standard creation, site admin can specify manager, standard user sets themselves implicitly in the service logic (often handled below).
  modalGym.managerEmail = auth.isSiteAdmin ? '' : (auth.user?.email || '')
  isModalOpen.value = true
}

function openTrainersModal(gymId: string) {
  selectedGymTrainers.value = trainersMap.value[gymId] || []
  isTrainersModalOpen.value = true
}

function openEditModal(g: Gym) {
  isEditing.value = true
  modalGym.id = g.id || ''
  modalGym.name = g.name || ''
  modalGym.location = g.location || ''
  modalGym.phone = g.phone || ''
  modalGym.openDate = g.openDate || ''
  modalGym.notes = g.notes || ''
  modalGym.managerEmail = g.managerEmail || ''
  isModalOpen.value = true
}

async function handleSaveGym() {
  if (!modalGym.name) return
  saving.value = true
  
  const payload: Partial<Gym> = {
    name: modalGym.name,
    location: modalGym.location,
    phone: modalGym.phone,
    openDate: modalGym.openDate,
    notes: modalGym.notes,
    managerEmail: modalGym.managerEmail
  }

  try {
    if (isEditing.value && modalGym.id) {
      await updateGym(modalGym.id, payload)
      ui.showToast(t('gymMgt.saveSuccess'), 'success')
    } else {
      await createGym(payload)
      ui.showToast(t('gymMgt.createSuccess'), 'success')
    }
    isModalOpen.value = false
    await fetchGymsData()
  } catch (e: any) {
    ui.showToast(t('gymMgt.createError') + ': ' + e.message, 'error')
  } finally {
    saving.value = false
  }
}

async function handleDeleteGym(g: Gym) {
  if (!g.id) return
  if (!confirm(t('gymMgt.confirmDelete'))) return
  
  try {
    await deleteGym(g.id)
    ui.showToast(t('gymMgt.deleteSuccess'), 'success')
    await fetchGymsData()
  } catch (e: any) {
    ui.showToast(t('gymMgt.deleteError') + ': ' + e.message, 'error')
  }
}

async function handleCreateGym() {
  if (!newGym.name) return
  loading.value = true
  try {
    await createGym({
      name: newGym.name,
      location: newGym.location,
      managerEmail: auth.user?.email || ''
    })
    ui.showToast(t('gymMgt.createSuccess'), 'success')
    // Re-fetch to update local state (manager will have gymId now)
    location.reload()
  } catch (e: any) {
    ui.showToast(t('gymMgt.createError') + ': ' + e.message, 'error')
  } finally {
    loading.value = false
  }
}
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
</style>
