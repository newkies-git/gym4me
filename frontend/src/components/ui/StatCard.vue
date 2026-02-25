<template>
  <div class="stat-card glass" :class="{ 'clickable': isClickable }" @click="handleClick">
    <div class="stat-value" :class="{ 'text-danger': isDanger }">{{ displayValue }}</div>
    <div class="stat-label">{{ label }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  value: string | number;
  label: string;
  isDanger?: boolean;
  isClickable?: boolean;
}>()

const emit = defineEmits<{
  (e: 'click'): void
}>()

const displayValue = computed(() => {
  if (props.value === undefined || props.value === null) return 'N/A'
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
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card.clickable {
  cursor: pointer;
}

.stat-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.stat-value {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 0.5rem;
}

.stat-value.text-danger {
  color: #f43f5e;
}

.stat-label {
  color: var(--text-muted);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
