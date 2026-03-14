<template>
  <div class="chart-section glass">
    <h3 class="card-title">{{ t('body.chartTitle') }}</h3>
    <div v-if="records.length === 0" class="empty-state">{{ t('body.noRecords') }}</div>
    <div v-else class="chart-container" style="position: relative; height:300px; width:100%">
        <Bar :data="chartData" :options="chartOptions" />
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
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { BodyRecord } from '../../types'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend
)

const props = defineProps<{
  records: BodyRecord[]
}>()
const { t } = useI18n()

const chartData = computed(() => {
  const labels = props.records.map(r => r.date)
  return {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: t('body.bodyFatLabel'),
        data: props.records.map(r => r.bodyFat ?? null),
        backgroundColor: 'rgba(244, 63, 94, 0.7)',
        borderColor: '#f43f5e',
        borderWidth: 1,
        order: 2,
        yAxisID: 'yPercent'
      },
      {
        type: 'bar' as const,
        label: t('body.muscleMassLabel'),
        data: props.records.map(r => r.muscleMass ?? null),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: '#10b981',
        borderWidth: 1,
        order: 1,
        yAxisID: 'y'
      },
      {
        type: 'line' as const,
        label: t('body.weightLabel'),
        data: props.records.map(r => r.weight),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: false,
        tension: 0.2,
        pointRadius: 4,
        order: 0,
        yAxisID: 'y'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  scales: {
    x: { grid: { display: false } },
    y: {
      type: 'linear',
      position: 'left',
      beginAtZero: true,
      title: { display: true, text: 'kg' },
      grid: { color: 'rgba(0,0,0,0.06)' }
    },
    yPercent: {
      type: 'linear',
      position: 'right',
      beginAtZero: true,
      title: { display: true, text: '%' },
      grid: { drawOnChartArea: false }
    }
  },
  plugins: {
    legend: { position: 'top' as const }
  }
}
</script>

<style scoped>
.chart-section {
  padding: 1.5rem;
  border-radius: 12px;
}

.card-title {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text-main);
  margin-bottom: 1.5rem;
}

.empty-state {
  color: #9ca3af;
  font-size: 0.9375rem;
  padding: 2.5rem 1rem;
  text-align: center;
  line-height: 1.5;
}
</style>
