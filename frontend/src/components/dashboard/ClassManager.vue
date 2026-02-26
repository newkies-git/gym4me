<template>
  <div class="class-manager glass" style="margin-bottom: 2rem;">
    <div class="flex-between" style="margin-bottom: 1.5rem;">
      <h3>My Classes</h3>
      <button class="btn btn-primary btn-sm" @click="isCreateModalOpen = true">+ Create Class</button>
    </div>

    <div v-if="loading" class="sm-text">Loading classes...</div>
    
    <div class="class-grid" v-else>
      <div v-for="cls in classes" :key="cls.id" class="class-card">
        <div class="class-info">
          <h4>{{ cls.name }}</h4>
          <p class="sm-text">{{ cls.traineeEmails.length }} Trainees enrolled</p>
        </div>
        <div class="class-actions">
          <button class="btn btn-ghost btn-sm" @click="openInviteModal(cls)">Invite</button>
          <button class="btn btn-ghost btn-sm" @click="viewClassSchedule(cls)">Schedule</button>
        </div>
        
        <div class="trainee-list-mini" v-if="cls.traineeEmails.length > 0">
          <div v-for="email in cls.traineeEmails.slice(0, 3)" :key="email" class="trainee-tag">
            {{ email.split('@')[0] }}
          </div>
          <div v-if="cls.traineeEmails.length > 3" class="trainee-tag">+{{ cls.traineeEmails.length - 3 }}</div>
        </div>
      </div>
      
      <div v-if="classes.length === 0" class="empty-state">
        No classes created yet. Create your first group class!
      </div>
    </div>

    <!-- Create Class Modal -->
    <BaseModal v-model:isOpen="isCreateModalOpen" title="Create New Class" max-width="400px">
      <div class="field">
        <label>Class Name</label>
        <input type="text" v-model="newClassName" placeholder="e.g., Morning Yoga, Advanced Lifting">
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="isCreateModalOpen = false">Cancel</button>
        <button class="btn btn-primary" @click="handleCreateClass" :disabled="!newClassName || saving">
          {{ saving ? 'Creating...' : 'Create' }}
        </button>
      </template>
    </BaseModal>

    <!-- Invite Trainee Modal -->
    <BaseModal v-model:isOpen="isInviteModalOpen" :title="'Invite to ' + selectedClass?.name" max-width="400px">
      <div class="field">
        <label>Trainee Email</label>
        <input type="email" v-model="inviteEmail" placeholder="trainee@example.com" @keyup.enter="handleInvite">
      </div>
      <template #footer>
        <button class="btn btn-ghost" @click="isInviteModalOpen = false">Cancel</button>
        <button class="btn btn-primary" @click="handleInvite" :disabled="!inviteEmail || inviting">
          {{ inviting ? 'Inviting...' : 'Invite' }}
        </button>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useClassStore } from '../../stores/classStore'
import { useUIStore } from '../../stores/uiStore'
import BaseModal from '../ui/BaseModal.vue'
import type { GymClass } from '../../types'

const classStore = useClassStore()
const ui = useUIStore()
const router = useRouter()

const loading = computed(() => classStore.loading)
const classes = computed(() => classStore.classes)

const isCreateModalOpen = ref(false)
const newClassName = ref('')
const saving = ref(false)

const isInviteModalOpen = ref(false)
const selectedClass = ref<GymClass | null>(null)
const inviteEmail = ref('')
const inviting = ref(false)

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
    ui.showToast('Class created successfully!', 'success')
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
    ui.showToast('Trainee added to class!', 'success')
  } catch (e: any) {
    ui.showToast(e.message, 'error')
  } finally {
    inviting.value = false
  }
}

const viewClassSchedule = (cls: GymClass) => {
  router.push(`/calendar?classId=${cls.id}`)
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
  background: rgba(255, 255, 255, 0.05);
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
.field input { width: 100%; padding: 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 0.5rem; color: white; outline: none; }
.sm-text { font-size: 0.8rem; color: var(--text-muted); }
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.8rem; }
</style>
