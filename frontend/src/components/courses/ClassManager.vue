<template>
  <div class="class-manager glass" style="margin-bottom: 2rem;">
    <div class="flex-between" style="margin-bottom: 1.5rem;">
      <h3>{{ t('classMgr.myClasses') }}</h3>
      <button class="btn btn-primary btn-sm" @click="goToCourseCreate">+ {{ t('classMgr.createClass') }}</button>
    </div>

    <div v-if="loading" class="sm-text">{{ t('classMgr.loading') }}</div>
    
    <div class="class-grid" v-else>
      <div v-for="cls in classes" :key="cls.id" class="class-card">
        <div class="class-info">
          <h4>{{ cls.name }}</h4>
          <p class="sm-text">{{ t('classMgr.membersCount', { n: cls.traineeEmails.length }) }}</p>
        </div>
        <div class="class-actions">
          <button class="btn btn-ghost btn-sm" @click="openInviteModal(cls)">{{ t('classMgr.invite') }}</button>
          <button class="btn btn-ghost btn-sm" @click="openTraineesModal(cls)">{{ t('classMgr.trainees') }}</button>
          <button class="btn btn-ghost btn-sm" @click="viewClassSchedule(cls)">{{ t('classMgr.viewCalendar') }}</button>
        </div>
        
        <div class="trainee-list-mini" v-if="cls.traineeEmails.length > 0">
          <div v-for="email in cls.traineeEmails.slice(0, 3)" :key="email" class="trainee-tag">
            {{ email.split('@')[0] }}
          </div>
          <div v-if="cls.traineeEmails.length > 3" class="trainee-tag">+{{ cls.traineeEmails.length - 3 }}</div>
        </div>
      </div>
      
      <div v-if="classes.length === 0" class="empty-state">
        {{ t('classMgr.noClasses') }}
      </div>
    </div>

    <!-- Create Class Modal -->
    <BaseModal v-model:isOpen="isCreateModalOpen" :title="t('classMgr.createClass')" max-width="400px">
      <div class="field">
        <label>{{ t('classMgr.className') }}</label>
        <input type="text" v-model="newClassName" :placeholder="t('classMgr.classNamePlaceholder')">
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="isCreateModalOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="handleCreateClass" :disabled="!newClassName || saving">
          {{ saving ? t('classMgr.creating') : t('classMgr.create') }}
        </button>
      </template>
    </BaseModal>

    <!-- Invite Trainee Modal -->
    <BaseModal v-model:isOpen="isInviteModalOpen" :title="t('classMgr.inviteToClass', { name: selectedClass?.name || '' })" max-width="400px">
      <div class="field">
        <label>{{ t('classMgr.inviteLabel') }}</label>
        <input type="email" v-model="inviteEmail" :placeholder="t('classMgr.invitePlaceholder')" @keyup.enter="handleInvite">
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="isInviteModalOpen = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="handleInvite" :disabled="!inviteEmail || inviting">
          {{ inviting ? t('classMgr.inviting') : t('classMgr.invite') }}
        </button>
      </template>
    </BaseModal>

    <BaseModal v-model:isOpen="isTraineesModalOpen" :title="t('classMgr.trainees')" max-width="460px">
      <div v-if="selectedClass?.traineeEmails?.length" class="trainee-list">
        <div v-for="email in selectedClass.traineeEmails" :key="email" class="trainee-row">
          <div>
            <strong>{{ email.split('@')[0] }}</strong>
            <div class="sm-text">{{ email }}</div>
          </div>
          <button class="btn btn-danger btn-sm" @click="removeTrainee(email)">{{ t('classMgr.removeTrainee') }}</button>
        </div>
      </div>
      <div v-else class="sm-text">{{ t('classMgr.noTrainees') }}</div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useClassStore } from '../../stores/classStore'
import { useUIStore } from '../../stores/uiStore'
import BaseModal from '../ui/BaseModal.vue'
import type { GymClass } from '../../types'

const classStore = useClassStore()
const ui = useUIStore()
const router = useRouter()
const { t } = useI18n()

const loading = computed(() => classStore.loading)
const classes = computed(() => classStore.classes)

const isCreateModalOpen = ref(false)
const newClassName = ref('')
const saving = ref(false)

const isInviteModalOpen = ref(false)
const selectedClass = ref<GymClass | null>(null)
const inviteEmail = ref('')
const inviting = ref(false)
const isTraineesModalOpen = ref(false)

onMounted(() => {
  classStore.fetchClasses()
})

const handleCreateClass = async () => {
  if (!newClassName.value) return
  saving.value = true
  try {
    await classStore.createNewClass(newClassName.value)
    newClassName.value = ''
    isCreateModalOpen.value = false
    ui.showToast(t('classMgr.createSuccess'), 'success')
  } catch (e: any) {
    ui.showToast(e.message, 'error')
  } finally {
    saving.value = false
  }
}

const openInviteModal = (cls: GymClass) => {
  selectedClass.value = cls
  inviteEmail.value = ''
  isInviteModalOpen.value = true
}

const handleInvite = async () => {
  if (!selectedClass.value || !inviteEmail.value) return
  inviting.value = true
  try {
    await classStore.inviteTrainee(selectedClass.value.id, inviteEmail.value.trim())
    inviteEmail.value = ''
    isInviteModalOpen.value = false
    ui.showToast(t('classMgr.inviteSuccess'), 'success')
  } catch (e: any) {
    ui.showToast(e.message, 'error')
  } finally {
    inviting.value = false
  }
}

const viewClassSchedule = (cls: GymClass) => {
  router.push(`/calendar/trainer?classId=${cls.id}`)
}

const goToCourseCreate = () => {
  router.push({ path: '/courses', query: { create: '1' } })
}

const openTraineesModal = (cls: GymClass) => {
  selectedClass.value = cls
  isTraineesModalOpen.value = true
}

const removeTrainee = async (email: string) => {
  if (!selectedClass.value) return
  if (!confirm(t('classMgr.confirmRemoveTrainee', { email }))) return
  try {
    await classStore.removeTrainee(selectedClass.value.id, email)
    selectedClass.value = classStore.classes.find((cls) => cls.id === selectedClass.value?.id) || null
    ui.showToast(t('classMgr.removeTraineeSuccess'), 'success')
  } catch (e: any) {
    ui.showToast(e.message, 'error')
  }
}
</script>

<style scoped>
.class-manager { padding: 2rem; border-radius: 1rem; }
.class-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
.class-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: transform 0.2s;
}
.class-card:hover { transform: translateY(-2px); border-color: var(--primary); }
.class-info h4 { margin-top: 0; margin-bottom: 0.5rem; }
.class-actions { display: flex; gap: 0.5rem; margin: 1rem 0; }
.trainee-list-mini { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.trainee-tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.5rem;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-radius: 1rem;
}
.empty-state { grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 2rem 0; font-style: italic; }
.field { margin-bottom: 1.5rem; }
.field label { display: block; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.9rem; font-weight: 600; }
.field input { width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 0.5rem; outline: none; }
.sm-text { font-size: 0.8rem; color: var(--text-muted); }
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
.trainee-list { display: flex; flex-direction: column; gap: 0.75rem; }
.trainee-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
}
</style>
