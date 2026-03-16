<template>
  <div class="modal-title">
    <p v-if="eyebrow" class="modal-title__eyebrow">
      {{ eyebrow }}
    </p>
    <h3 class="modal-title__main">
      <slot>{{ title }}</slot>
    </h3>
    <p v-if="subtitle" class="modal-title__subtitle">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  eyebrow?: string
}>()
</script>

<style scoped>
.modal-title {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.modal-title__eyebrow {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.modal-title__main {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.modal-title__subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>

