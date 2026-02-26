<template>
  <div class="add-section glass">
    <h3>{{ t('body.addRecord') }}</h3>
    <form @submit.prevent="submit">
        <div class="field">
            <label>{{ t('body.date') }}</label>
            <input type="date" v-model="form.date" required>
        </div>
        <div class="field">
            <label>{{ t('body.weight') }}</label>
            <input type="number" step="0.1" v-model.number="form.weight" required>
        </div>
        <div class="field">
            <label>{{ t('body.bodyFatOptional') }}</label>
            <input type="number" step="0.1" v-model.number="form.bodyFat">
        </div>
        <div class="field">
            <label>{{ t('body.muscleMassOptional') }}</label>
            <input type="number" step="0.1" v-model.number="form.muscleMass">
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top: 1rem; width: 100%" :disabled="saving">{{ t('body.save') }}</button>
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
h3 { margin-bottom: 1.5rem; }
</style>
