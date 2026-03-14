<template>
  <div class="add-section glass profile-form">
    <h3 class="card-title">{{ t('body.addRecord') }}</h3>
    <form @submit.prevent="submit">
        <div class="field">
            <label>{{ t('body.date') }}</label>
            <div class="input-with-icon">
                <input type="date" v-model="form.date" required>
                <span class="field-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </span>
            </div>
        </div>
        <div class="field">
            <label>{{ t('body.weight') }}</label>
            <input type="number" step="0.1" v-model.number="form.weight" required placeholder="0">
        </div>
        <div class="field">
            <label>{{ t('body.bodyFatOptional') }}</label>
            <input type="number" step="0.1" v-model.number="form.bodyFat">
        </div>
        <div class="field">
            <label>{{ t('body.muscleMassOptional') }}</label>
            <input type="number" step="0.1" v-model.number="form.muscleMass">
        </div>
        <button type="submit" class="btn btn-primary submit-btn" :disabled="saving">{{ t('body.save') }}</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
    saving: boolean
}>()

const emit = defineEmits<{
    (e: 'save', payload: { date: string, weight: number, bodyFat?: number, muscleMass?: number }): void
}>()

const { t } = useI18n()

const form = ref({
    date: new Date().toISOString().split('T')[0],
    weight: 0,
    bodyFat: undefined as number | undefined,
    muscleMass: undefined as number | undefined
})

const submit = () => {
    emit('save', {
        date: form.value.date,
        weight: form.value.weight,
        bodyFat: form.value.bodyFat,
        muscleMass: form.value.muscleMass
    })
    
    // Reset form except date
    form.value.weight = 0;
    form.value.bodyFat = undefined;
    form.value.muscleMass = undefined;
}
</script>

<style scoped>
.profile-form {
  padding: 1.5rem;
}

.card-title {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-main);
  margin-bottom: 1.5rem;
}

.field {
  margin-bottom: 1.25rem;
}

.field label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-main);
  font-weight: 500;
}

.field input {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: #f5f5f5;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: var(--text-main);
  font-size: 0.9375rem;
  outline: none;
  transition: border-color 0.2s, background-color 0.2s;
}

.field input:focus {
  border-color: var(--primary);
  background-color: #fff;
  box-shadow: 0 0 0 2px rgba(94, 53, 177, 0.1);
}

.input-with-icon {
  position: relative;
  display: block;
}

.input-with-icon input {
  padding-right: 2.75rem;
}

.field-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn {
  margin-top: 1.25rem;
  width: 100%;
}
</style>
