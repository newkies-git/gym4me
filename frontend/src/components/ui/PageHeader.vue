<template>
  <div class="header page-header flex-between mb-4">
    <div class="header-main">
      <div class="title-wrap">
        <h2>{{ title }}</h2>
      </div>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions || showBack" class="header-actions">
      <slot name="actions"></slot>
      <button v-if="showBack" class="back-btn" @click="handleBack" aria-label="Go back">
        <span class="icon">←</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = defineProps<{
  title: string
  subtitle?: string
  showBack?: boolean
  backUrl?: string
}>()

const router = useRouter()

const handleBack = () => {
  if (props.backUrl) {
    router.push(props.backUrl)
  } else {
    router.back()
  }
}
</script>

<style scoped>
.title-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-wrap h2 {
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.25;
  margin: 0;
}

.back-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 1.125rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
}

.back-btn:hover {
  color: var(--primary);
  background: rgba(94, 53, 177, 0.1);
  transform: translateX(4px);
}

.subtitle {
  margin: 0.15rem 0 0 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.3;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

@media (max-width: 640px) {
  .header-actions {
    margin-top: 0;
  }
}
</style>
