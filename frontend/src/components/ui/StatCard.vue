<template>
  <div class="stat-card glass" :class="{ 'clickable': isClickable }" @click="handleClick">
    <div class="stat-main">
      <div class="stat-value" :class="{ 'text-danger': isDanger }">{{ displayValue }}</div>
      <div class="stat-label">{{ label }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  value: string | number;
  label: string;
  isDanger?: boolean;
  isClickable?: boolean;
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()
const { t } = useI18n()

const displayValue = computed(() => {
  if (props.value === undefined || props.value === null) return t('common.na')
  return props.value
})

const handleClick = () => {
  if (props.isClickable) {
    emit('click')
  }
}
</script>

<style scoped>
.stat-card {
  padding: 1.1rem 1.25rem;
  border-radius: 0.9rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.stat-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--primary);
}

.stat-value.text-danger {
  color: #f43f5e;
}

.stat-label {
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
