<template>
  <div class="theme-switcher">
    <div class="theme-switcher-label">{{ t('nav.theme') }}</div>
    <div class="theme-switcher-grid">
      <button
        v-for="theme in themeStore.allThemes"
        :key="theme.id"
        type="button"
        class="theme-swatch"
        :class="{ active: themeStore.themeId === theme.id }"
        :style="{ backgroundColor: theme.primary }"
        :title="t(theme.nameKey)"
        @click="selectTheme(theme.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '../stores/themeStore'

const themeStore = useThemeStore()
const { t } = useI18n()

function selectTheme(id: string) {
  themeStore.setTheme(id)
}
</script>

<style scoped>
.theme-switcher {
  padding: 0.5rem 1rem;
}

.theme-switcher-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.theme-switcher-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.theme-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.theme-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.theme-swatch.active {
  border-color: var(--text-main);
  box-shadow: 0 0 0 2px var(--bg-card);
}
</style>
