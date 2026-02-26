<template>
  <div class="chart-section glass">
    <h3>{{ t('body.chartTitle') }}</h3>
    <div v-if="records.length === 0" class="empty-state">{{ t('body.noRecords') }}</div>
    <div v-else class="chart-container" style="position: relative; height:300px; width:100%">
        <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'vue-chartjs'
import type { BodyRecord } from '../../types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

const props = defineProps<{
  records: BodyRecord[]
}>()
const { t } = useI18n()

const chartData = computed(() => {
    return {
        labels: props.records.map(r => r.date),
        datasets: [
            {
                label: t('body.weightLabel'),
                backgroundColor: '#6366f1',
                borderColor: '#6366f1',
                data: props.records.map(r => r.weight)
            },
            {
                label: t('body.bodyFatLabel'),
                backgroundColor: '#f43f5e',
                borderColor: '#f43f5e',
                data: props.records.map(r => r.bodyFat || null)
            }
        ]
    }
})

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    spanGaps: true // Connect lines if some data is missing
}
</script>

<style scoped>
.chart-section { padding: 2rem; border-radius: 1rem; }
h3 { margin-bottom: 1.5rem; }
.empty-state { color: var(--text-muted); font-style: italic; padding: 2rem 0; text-align: center; }
</style>
