<template>
  <BaseModal
    :isOpen="isOpen"
    @update:isOpen="$emit('update:isOpen', $event)"
    :title="t('gymTrainee.addCredit')"
  >
    <div class="form-grid">
      <div class="form-group">
        <label>{{ t('gymTrainee.purchaseDate') }}</label>
        <input type="date" v-model="form.purchaseDate" class="form-control" />
      </div>
      <div class="form-group">
        <label>{{ t('gymTrainee.ptCount') }}</label>
        <input type="number" v-model.number="form.amount" class="form-control" min="1" />
      </div>
      <div class="form-group">
        <label>{{ t('gymTrainee.expirationDate') }}</label>
        <input type="date" v-model="form.expirationDate" class="form-control" />
      </div>
    </div>
    <template #footer>
      <button class="btn btn-ghost" @click="$emit('update:isOpen', false)">
        {{ t('common.cancel') }}
      </button>
      <button class="btn btn-primary" :disabled="loading || !isValid" @click="handleSubmit">
        {{ loading ? t('common.processing') : t('common.register') }}
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseModal from '../ui/BaseModal.vue'
import { addTicketCredit } from '../../services/firebaseService'
import { useAuthStore } from '../../stores/auth'

const props = defineProps<{
  isOpen: boolean
  traineeUid: string
}>()

const emit = defineEmits(['update:isOpen', 'success'])

const { t } = useI18n()
const auth = useAuthStore()
const loading = ref(false)

const form = ref({
  purchaseDate: new Date().toISOString().split('T')[0],
  amount: 10,
  expirationDate: ''
})

// Auto-calculate expiration date to 3 months later by default
watch(() => form.value.purchaseDate, (newVal) => {
    if (newVal) {
        const d = new Date(newVal)
        d.setMonth(d.getMonth() + 3)
        form.value.expirationDate = d.toISOString().split('T')[0]
    }
}, { immediate: true })

const isValid = computed(() => {
  return form.value.purchaseDate && form.value.amount > 0 && form.value.expirationDate
})

async function handleSubmit() {
  if (!isValid.value || !auth.user?.email) return
  
  loading.value = true
  try {
    await addTicketCredit(props.traineeUid, {
      amount: form.value.amount,
      purchaseDate: form.value.purchaseDate,
      expirationDate: form.value.expirationDate,
      registrantEmail: auth.user.email
    })
    emit('success')
    emit('update:isOpen', false)
  } catch (err) {
    console.error('Failed to add credit:', err)
    alert('Failed to add credit')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form-grid {
  display: grid;
  gap: 1rem;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}
.form-control {
  padding: 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
</style>
