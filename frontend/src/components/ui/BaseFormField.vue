<template>
  <div class="base-field">
    <label v-if="label" class="base-field__label">
      {{ label }}
      <span v-if="required" class="base-field__required">*</span>
    </label>
    <div class="base-field__control">
      <slot />
    </div>
    <p v-if="error" class="base-field__error">
      {{ error }}
    </p>
    <p v-else-if="hint" class="base-field__hint">
      {{ hint }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label?: string
    required?: boolean
    error?: string
    hint?: string
  }>(),
  {
    required: false
  }
)
</script>

<style scoped>
.base-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.base-field__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.base-field__required {
  margin-left: 0.2rem;
  color: var(--accent);
}

.base-field__control {
  width: 100%;
}

.base-field__error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--accent);
}

.base-field__hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>

