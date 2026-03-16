<template>
  <select
    v-model="modelValue"
    class="base-select"
    :disabled="disabled"
  >
    <option v-if="placeholder" value="">{{ placeholder }}</option>
    <option
      v-for="opt in options"
      :key="String(opt.value)"
      :value="opt.value"
    >
      {{ opt.label }}
    </option>
  </select>
</template>

<script setup lang="ts">
export interface SelectOption {
  value: string | number
  label: string
}

const modelValue = defineModel<string | number | ''>()

const props = withDefaults(
  defineProps<{
    options: SelectOption[]
    placeholder?: string
    disabled?: boolean
  }>(),
  {
    options: () => [],
    placeholder: '',
    disabled: false
  }
)
</script>

<style scoped>
.base-select {
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

.base-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px rgba(129, 140, 248, 0.35);
}

.base-select:disabled {
  background-color: rgba(148, 163, 184, 0.1);
  cursor: not-allowed;
}
</style>

