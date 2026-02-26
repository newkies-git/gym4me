<template>
  <div class="history-section glass">
    <h3>{{ t('profileHistory.title') }}</h3>
    <ul class="history-list">
        <li v-for="rec in reversedRecords" :key="rec.id" class="history-item">
            <div class="date" style="font-weight:bold; font-size:0.9rem;">{{ rec.date }}</div>
            <div class="stats">
                <span class="badge w">{{ rec.weight }}kg</span>
                <span v-if="rec.bodyFat" class="badge f">{{ t('body.bodyFatLabel') }}: {{ rec.bodyFat }}%</span>
                <span v-if="rec.muscleMass" class="badge m">{{ t('body.muscleMassLabel') }}: {{ rec.muscleMass }}kg</span>
            </div>
        </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BodyRecord } from '../../types'

const props = defineProps<{
    records: BodyRecord[]
}>()

const { t } = useI18n()

const reversedRecords = computed(() => {
    return [...props.records].reverse()
})
</script>

<style scoped>
.history-section { padding: 2rem; }
h3 { margin-bottom: 1.5rem; }
.history-list { max-height: 400px; overflow-y: auto; }
.stats { display: flex; gap: 0.5rem; margin-top: 0.3rem; }
.badge { font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 1rem; color: white; font-weight: 600; }
.badge.w { background: #6366f1; }
.badge.f { background: #f43f5e; }
.badge.m { background: #10b981; }
</style>
