<template>
  <input
    v-model="modelValue"
    class="base-input"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
  />
</template>

<script setup lang="ts">
const modelValue = defineModel<string | number | undefined>()

const props = withDefaults(
  defineProps<{
    type?: string
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    type: 'text',
    placeholder: '',
    disabled: false
  }
)
</script>

<style scoped>
.base-input {
  width: 100%;
  height: 2.9rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background-color: var(--bg-input, #fff);
  font-size: 0.9rem;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.base-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.35);
}

.base-input:disabled {
  background-color: rgba(148, 163, 184, 0.1);
  cursor: not-allowed;
}
</style>

