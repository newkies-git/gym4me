<template>
  <div class="base-list-view" :class="{ dense }">
    <div v-if="loading" class="state">
      <slot name="loading">
        <div class="state-text">{{ loadingText }}</div>
      </slot>
    </div>

    <div v-else-if="error" class="state state-error">
      <slot name="error" :error="error">
        <div class="state-text">{{ error }}</div>
      </slot>
    </div>

    <div v-else-if="!items.length" class="state">
      <slot name="empty">
        <div class="state-text">{{ emptyText }}</div>
      </slot>
    </div>

    <div v-else class="list" role="list">
      <div
        v-for="(item, index) in items"
        :key="resolveKey(item, index)"
        class="list-item"
        role="listitem"
      >
        <slot name="item" :item="item" :index="index" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends Record<string, any>">
type KeyResolver<TItem> = keyof TItem | ((item: TItem, index: number) => string | number)

const props = withDefaults(defineProps<{
  items: T[]
  loading?: boolean
  error?: string
  emptyText?: string
  loadingText?: string
  dense?: boolean
  itemKey?: KeyResolver<T>
}>(), {
  loading: false,
  error: '',
  emptyText: '—',
  loadingText: 'Loading...',
  dense: false
})

const resolveKey = (item: T, index: number) => {
  const key = props.itemKey
  if (!key) return index
  if (typeof key === 'function') return key(item, index)
  return (item as any)?.[key] ?? index
}
</script>

<style scoped>
.base-list-view {
  width: 100%;
}

.state {
  padding: 1.25rem 1rem;
}

.state-text {
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
}

.state-error .state-text {
  color: var(--accent);
  font-style: normal;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.dense .list {
  gap: 0.5rem;
}

.list-item {
  min-width: 0;
}
</style>

