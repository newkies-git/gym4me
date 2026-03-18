<template>
  <div class="theme-switcher">
    <div class="theme-switcher-label">{{ t('nav.theme') }}</div>
    <div class="theme-switcher-grid">
      <template v-for="(item, index) in gridItems" :key="item.key">
        <button
          v-if="item.type === 'theme'"
          type="button"
          class="theme-swatch"
          :class="{ active: themeStore.themeId === item.theme.id }"
          :style="{ backgroundColor: item.theme.primary }"
          :title="t(item.theme.nameKey)"
          @click="selectTheme(item.theme.id)"
        />
        <button
          v-else-if="item.type === 'mode' && item.mode === 'dark'"
          type="button"
          class="mode-swatch dark"
          :class="{ active: themeStore.colorMode === 'dark' }"
          :title="t('theme.dark')"
          aria-label="Dark mode"
          @click="themeStore.setColorMode('dark')"
        />
        <button
          v-else-if="item.type === 'mode' && item.mode === 'light'"
          type="button"
          class="mode-swatch"
          :class="{ active: themeStore.colorMode === 'light' }"
          :title="t('theme.light')"
          aria-label="Light mode"
          @click="themeStore.setColorMode('light')"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '../stores/themeStore'
const themeStore = useThemeStore()
const { t } = useI18n()

const gridItems = computed(() => {
  const themes = themeStore.allThemes
  return [
    { type: 'theme' as const, theme: themes[0], key: themes[0].id },
    { type: 'theme' as const, theme: themes[1], key: themes[1].id },
    { type: 'theme' as const, theme: themes[2], key: themes[2].id },
    { type: 'theme' as const, theme: themes[3], key: themes[3].id },
    { type: 'mode' as const, mode: 'dark' as const, key: 'dark' },
    { type: 'theme' as const, theme: themes[4], key: themes[4].id },
    { type: 'theme' as const, theme: themes[5], key: themes[5].id },
    { type: 'theme' as const, theme: themes[6], key: themes[6].id },
    { type: 'theme' as const, theme: themes[7], key: themes[7].id },
    { type: 'mode' as const, mode: 'light' as const, key: 'light' }
  ]
})

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

.mode-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  background-color: #f1f5f9;
}

.mode-swatch.dark {
  background-color: #334155;
}

.mode-swatch:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.mode-swatch.active {
  border-color: var(--text-main);
  box-shadow: 0 0 0 2px var(--bg-card);
}

.theme-switcher-grid {
  display: grid;
  grid-template-columns: repeat(5, 28px);
  grid-template-rows: repeat(2, 28px);
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
