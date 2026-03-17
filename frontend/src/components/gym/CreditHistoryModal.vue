<template>
  <BaseModal
    :isOpen="isOpen"
    @update:isOpen="$emit('update:isOpen', $event)"
    :title="t('gymMember.creditHistory')"
    maxWidth="800px"
  >
    <div v-if="loading" class="loading-state">{{ t('common.loading') }}</div>
    <div v-else-if="errorMessage" class="empty-state" style="color: #dc3545;">⚠️ {{ errorMessage }}</div>
    <div v-else class="history-table-container">
      <table class="history-table">
        <thead>
          <tr>
            <th>{{ t('gymMember.date') }}</th>
            <th>{{ t('gymMember.action') }}</th>
            <th>{{ t('gymMember.amount') }}</th>
            <th>{{ t('gymMember.sessionsAfter') }}</th>
            <th>{{ t('gymMember.registrant') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in history" :key="entry.id">
            <td>{{ formatDateTime(entry.createdAt) }}</td>
            <td>
              <span :class="['badge', entry.action.toLowerCase()]">
                {{ t(`gymMember.actionType.${entry.action}`) }}
              </span>
            </td>
            <td :class="entry.amount >= 0 ? 'text-success' : 'text-danger'">
              {{ entry.amount >= 0 ? '+' : '' }}{{ entry.amount }}
            </td>
            <td>{{ entry.remainingSessionsAfter }}</td>
            <td>
              <div class="registrant-info">
                <span class="email">{{ entry.registrantEmail }}</span>
              </div>
            </td>
          </tr>
          <tr v-if="!history.length">
            <td colspan="5" class="empty-state">{{ t('common.noData') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <template #footer>
      <button class="btn btn-ghost" @click="$emit('update:isOpen', false)">
        {{ t('common.close') }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '../ui/BaseModal.vue'
import { getTicketHistory } from '../../services/firebaseService'
import type { TicketHistoryEntry } from '../../types'

const props = defineProps<{
  isOpen: boolean
  memberUid: string
}>()

const { t } = useI18n()
const loading = ref(false)
const history = ref<TicketHistoryEntry[]>([])
const errorMessage = ref('')

watch(() => props.isOpen, async (newVal) => {
  if (newVal && props.memberUid) {
    loading.value = true
    errorMessage.value = ''
    try {
      history.value = await getTicketHistory(props.memberUid)
    } catch (err: any) {
      console.error('Failed to fetch history:', err)
      errorMessage.value = err.message || 'Failed to fetch history'
    } finally {
      loading.value = false
    }
  }
})

function formatDateTime(timestamp: any) {
  if (!timestamp) return '-'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<style scoped>
.history-table-container {
  overflow-x: auto;
}
.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.history-table th, .history-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.history-table th {
  color: var(--text-muted);
  font-weight: 600;
  background: var(--surface-light);
}
.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge.add { background: rgba(var(--success-rgb, 40, 167, 69), 0.1); color: var(--success, #28a745); }
.badge.use { background: rgba(var(--primary-rgb, 0, 123, 255), 0.1); color: var(--primary, #007bff); }
.text-success { color: #28a745; }
.text-danger { color: #dc3545; }
.loading-state, .empty-state { padding: 2rem; text-align: center; color: var(--text-muted); }
.registrant-info { font-size: 0.8rem; }
</style>
