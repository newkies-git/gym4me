<template>
  <div class="gym-member-wrapper container">
    <div class="header page-header">
      <h2>{{ t('gymMember.title') }}</h2>
      <p class="sm-text">{{ t('gymMember.subtitle') }}</p>
    </div>

    <div class="search-bar glass" style="margin: 1.5rem 0; padding: 1rem;">
      <input 
        type="text" 
        v-model="searchQuery" 
        :placeholder="t('gymMember.searchPlaceholder')"
        class="glass-input"
        style="width: 100%;"
      >
    </div>

    <div v-if="loading" class="empty-state">{{ t('common.loading') }}</div>
    <div v-else class="member-table-container glass">
      <table class="member-table">
        <thead>
          <tr>
            <th>{{ t('gymMember.nickname') }}</th>
            <th>{{ t('gymMember.email') }}</th>
            <th>{{ t('gymMember.remainingSessions') }}</th>
            <th>{{ t('gymMember.expirationDate') }}</th>
            <th>{{ t('gymMember.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in filteredMembers" :key="member.uid">
            <td>{{ member.nickname }}</td>
            <td>{{ member.email }}</td>
            <td :class="{ 'warning-text': (member.remainingSessions || 0) < 3 }">
                {{ member.remainingSessions }}
            </td>
            <td :class="{ 'warning-text': isExpired(member.expirationDate) }">
                {{ member.expirationDate || 'N/A' }}
            </td>
            <td>
              <button class="btn btn-ghost btn-mini" @click="viewDetails(member)">
                {{ t('common.details' as any) || 'Details' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Details Modal (Future Enhancement: can add credit adjustment here if needed) -->
    <BaseModal v-model:isOpen="isModalOpen" :title="selectedMember?.nickname || ''">
        <div v-if="selectedMember" class="member-info-details">
            <div class="detail-row">
                <span>{{ t('gymMember.email') }}:</span>
                <strong>{{ selectedMember.email }}</strong>
            </div>
            <div class="detail-row">
                <span>{{ t('gymMember.remainingSessions') }}:</span>
                <strong>{{ selectedMember.remainingSessions }}</strong>
            </div>
            <div class="detail-row">
                <span>{{ t('gymMember.expirationDate') }}:</span>
                <strong>{{ selectedMember.expirationDate || 'N/A' }}</strong>
            </div>
        </div>
        <template #footer>
            <button class="btn btn-ghost" @click="isModalOpen = false">{{ t('common.close') }}</button>
        </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import { getGymMembers } from '../services/firebaseService'
import type { ClientInfo } from '../types'
import BaseModal from '../components/ui/BaseModal.vue'

const { t } = useI18n()
const auth = useAuthStore()

const loading = ref(true)
const members = ref<ClientInfo[]>([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const selectedMember = ref<ClientInfo | null>(null)

const filteredMembers = computed(() => {
    if (!searchQuery.value) return members.value
    const q = searchQuery.value.toLowerCase()
    return members.value.filter(m => 
        m.nickname?.toLowerCase().includes(q) || 
        m.email.toLowerCase().includes(q)
    )
})

onMounted(async () => {
    if (!auth.user?.gymId) return
    loading.value = true
    try {
        members.value = await getGymMembers(auth.user.gymId)
    } finally {
        loading.value = false
    }
})

const isExpired = (dateStr?: string) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
}

const viewDetails = (member: ClientInfo) => {
    selectedMember.value = member
    isModalOpen.value = true
}
</script>

<style scoped>
.gym-member-wrapper { 
  padding: 6rem 1rem 2rem 1rem; 
}
.member-table-container { overflow-x: auto; }
.member-table { width: 100%; border-collapse: collapse; text-align: left; }
.member-table th, .member-table td { padding: 1rem; border-bottom: 1px solid var(--border); }
.member-table th { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; }
.member-table tr:last-child td { border-bottom: none; }
.warning-text { color: var(--accent); font-weight: 600; }
.detail-row { display: flex; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
.detail-row:last-child { border-bottom: none; }
.btn-mini { padding: 0.2rem 0.6rem; font-size: 0.75rem; }
</style>
