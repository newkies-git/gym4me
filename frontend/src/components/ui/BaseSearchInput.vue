<template>
  <div class="base-search">
    <span class="base-search__icon">🔍</span>
    <input
      v-model="modelValue"
      class="base-search__input"
      :placeholder="placeholder"
      type="text"
    />
    <button
      v-if="modelValue"
      type="button"
      class="base-search__clear"
      @click="clear"
      aria-label="clear search"
    >
      ×
    </button>
  </div>
</template>

<script setup lang="ts">
const modelValue = defineModel<string>({ default: '' })

defineProps<{
  placeholder?: string
}>()

const clear = () => {
  modelValue.value = ''
}
</script>

<style scoped>
.base-search {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 2.9rem;
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--bg-input, #fff);
  box-sizing: border-box;
}

.base-search__icon {
  font-size: 0.9rem;
  opacity: 0.6;
}

.base-search__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.9rem;
}

.base-search__clear {
  border: none;
  background: transparent;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.7;
}

.base-search__clear:hover {
  opacity: 1;
}
</style>

