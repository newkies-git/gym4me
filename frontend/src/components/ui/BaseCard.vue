<template>
  <div
    class="base-card glass"
    :class="[{ 'base-card--clickable': clickable }, variantClass]"
    @click="handleClick"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    clickable?: boolean
    variant?: 'default' | 'outlined' | 'subtle'
  }>(),
  {
    clickable: false,
    variant: 'default'
  }
)

const emit = defineEmits<{
  (e: 'click'): void
}>()

const variantClass = computed(() => {
  if (props.variant === 'outlined') return 'base-card--outlined'
  if (props.variant === 'subtle') return 'base-card--subtle'
  return ''
})

const handleClick = (event: MouseEvent) => {
  if (!props.clickable) return
  emit('click')
}
</script>

<style scoped>
.base-card {
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.base-card--clickable {
  cursor: pointer;
}

.base-card--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
}

.base-card--outlined {
  background: transparent;
}

.base-card--subtle {
  background: rgba(255, 255, 255, 0.85);
}
</style>

