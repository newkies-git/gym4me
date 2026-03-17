<template>
  <div class="gym-member-wrapper container">
    <PageHeader
      :title="t('gymMember.title')"
      :subtitle="t('gymMember.subtitle')"
      :showBack="true"
      back-url="/home"
    />

    <div class="filter-bar glass">
      <div v-if="auth.isSiteAdmin" class="gym-filter">
        <label class="filter-label">{{ t('gymMgt.title') }}</label>
        <BaseSelect
          v-model="selectedGymId"
          class="gym-select"
          :options="[{ value: '__all__', label: (t('common.all' as any) || '전체') }, ...gyms.map(g => ({ value: g.id, label: g.name }))]"
        />
      </div>

      <div class="search-bar-inner">
        <BaseSearchInput
          v-model="searchQuery"
          :placeholder="t('gymMember.searchPlaceholder')"
        />
      </div>
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
            <th v-if="showActions">{{ t('gymMember.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in pagedMembers" :key="member.uid">
            <td>{{ member.nickname }}</td>
            <td>{{ member.email }}</td>
            <td :class="{ 'warning-text': (member.remainingSessions || 0) < 3 }">
                {{ member.remainingSessions }}
            </td>
            <td :class="{ 'warning-text': isExpired(member.expirationDate) }">
                {{ member.expirationDate || t('common.na') }}
            </td>
            <td v-if="showActions">
              <button class="btn btn-ghost btn-mini" @click="viewDetails(member)">
                {{ t('common.details' as any) || 'Details' }}
              </button>
            </td>
          </tr>
          <tr v-if="!pagedMembers.length">
            <td :colspan="showActions ? 5 : 4" class="empty-state">
              {{ t('gymMember.noMembers') || t('common.na') }}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="totalPages > 1">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="page === 1"
          @click="page--"
        >
          ‹
        </button>
        <span class="page-indicator">
          {{ page }} / {{ totalPages }}
        </span>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="page === totalPages"
          @click="page++"
        >
          ›
        </button>
      </div>
    </div>

    <!-- Details Modal -->
    <BaseModal v-model:isOpen="isModalOpen" :title="selectedMember?.nickname || ''">
        <div v-if="selectedMember" class="member-info-details">
            <div class="detail-row">
                <span>{{ t('gymMember.email') }}:</span>
                <strong>{{ selectedMember.email }}</strong>
            </div>
            <div class="detail-row">
                <span>{{ t('gymMember.remainingSessions') }}:</span>
                <strong class="sessions-count">{{ selectedMember.remainingSessions ?? 0 }}</strong>
            </div>
            <div class="detail-row">
                <span>{{ t('gymMember.expirationDate') }}:</span>
                <strong>{{ selectedMember.expirationDate || t('common.na') }}</strong>
            </div>
        </div>
        <template #footer>
            <button class="btn btn-ghost" @click="isModalOpen = false">{{ t('common.close') }}</button>
            <button class="btn btn-secondary" @click="openHistory">{{ t('gymMember.creditHistory') }}</button>
            <button v-if="canManageCredit" class="btn btn-primary" @click="openAddCredit">{{ t('gymMember.addCredit') }}</button>
        </template>
    </BaseModal>

    <!-- Credit Add Modal -->
    <CreditAddModal
      v-if="selectedMember"
      v-model:isOpen="isCreditAddOpen"
      :memberUid="selectedMember.uid"
      @success="onCreditAdded"
    />

    <!-- Credit History Modal -->
    <CreditHistoryModal
      v-if="selectedMember"
      v-model:isOpen="isCreditHistoryOpen"
      :memberUid="selectedMember.uid"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseModal from '../components/ui/BaseModal.vue'
import BaseSearchInput from '../components/ui/BaseSearchInput.vue'
import BaseSelect from '../components/ui/BaseSelect.vue'
import CreditAddModal from '../components/gym/CreditAddModal.vue'
import CreditHistoryModal from '../components/gym/CreditHistoryModal.vue'
import { getGymMembers, getGyms } from '../services/firebaseService'
import { getCoursesForUser } from '../services/courseService'
import type { ClientInfo } from '../types'

const { t } = useI18n()
const auth = useAuthStore()

const loading = ref(true)
const members = ref<ClientInfo[]>([])
const searchQuery = ref('')
const isModalOpen = ref(false)
const isCreditAddOpen = ref(false)
const isCreditHistoryOpen = ref(false)
const selectedMember = ref<ClientInfo | null>(null)
const page = ref(1)
const pageSize = 20
const gyms = ref<{ id: string; name: string }[]>([])
const selectedGymId = ref<string>('__all__')

const showActions = computed(() => !!(auth.isTrainer || auth.isManager || auth.isSiteAdmin))
const canManageCredit = computed(() => !!(auth.isManager || auth.isSiteAdmin))

const filteredMembers = computed(() => {
  let base = members.value
  if (auth.isSiteAdmin && selectedGymId.value !== '__all__') {
    base = base.filter((m) => m.gymId === selectedGymId.value)
  }
  if (!searchQuery.value) return base
  const q = searchQuery.value.toLowerCase()
  return base.filter(
    (m) =>
      m.nickname?.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
  )
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredMembers.value.length / pageSize))
)

const pagedMembers = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredMembers.value.slice(start, start + pageSize)
})

onMounted(async () => {
  if (!auth.user) return
  loading.value = true
  try {
    if (auth.isSiteAdmin) {
      gyms.value = await getGyms()
      const allMembers: ClientInfo[] = []
      for (const g of gyms.value) {
        const list = await getGymMembers(g.id)
        list.forEach((m) => allMembers.push({ ...m, gymId: g.id } as any))
      }
      members.value = allMembers
    } else if (auth.isManager) {
      if (!auth.user.gymId) {
        members.value = []
      } else {
        members.value = await getGymMembers(auth.user.gymId)
      }
    } else if (auth.isTrainer) {
      if (!auth.user.gymId || !auth.user.email) {
        members.value = []
      } else {
        const [gymMembers, courses] = await Promise.all([
          getGymMembers(auth.user.gymId),
          getCoursesForUser(auth.user.email)
        ])
        const traineeSet = new Set<string>()
        courses.forEach((c) => {
          ;(c.traineeEmails || []).forEach((email) => traineeSet.add(email))
        })
        members.value = gymMembers.filter((m) => traineeSet.has(m.email))
      }
    } else {
      members.value = []
    }
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

const openAddCredit = () => {
    isModalOpen.value = false
    isCreditAddOpen.value = true
}

const openHistory = () => {
    isModalOpen.value = false
    isCreditHistoryOpen.value = true
}

const onCreditAdded = async () => {
    // Refresh member data from Firestore after adding credit
    if (!auth.user) return
    loading.value = true
    try {
        let refreshed: ClientInfo[] = []
        if (auth.isSiteAdmin) {
            for (const g of gyms.value) {
                const list = await getGymMembers(g.id)
                list.forEach((m) => refreshed.push({ ...m, gymId: g.id } as any))
            }
        } else if (auth.isManager && auth.user.gymId) {
            refreshed = await getGymMembers(auth.user.gymId)
        } else if (auth.isTrainer && auth.user.gymId && auth.user.email) {
            const [gymMembers, courses] = await Promise.all([
                getGymMembers(auth.user.gymId),
                getCoursesForUser(auth.user.email)
            ])
            const traineeSet = new Set<string>()
            courses.forEach((c) => { (c.traineeEmails || []).forEach((e) => traineeSet.add(e)) })
            refreshed = gymMembers.filter((m) => traineeSet.has(m.email))
        }
        members.value = refreshed

        // Update the selected member reference so the detail modal shows the new count
        if (selectedMember.value) {
            const updated = refreshed.find((m) => m.uid === selectedMember.value!.uid)
            if (updated) selectedMember.value = updated
        }
    } finally {
        loading.value = false
    }
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
.sessions-count { font-size: 1.1rem; }

.filter-bar {
  margin: 1.5rem 0;
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-end;
}

.gym-filter {
  min-width: 220px;
}

.filter-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
}

.gym-select {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
}

.search-bar-inner {
  flex: 1;
}

.glass-input {
  width: 100%;
}

.pagination {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.page-indicator {
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>
