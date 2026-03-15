import { defineStore } from 'pinia'
import { THEMES, getThemeById, DEFAULT_THEME_ID, type ThemeDefinition } from '../theme/themes'

const STORAGE_KEY = 'gym4me_theme_id'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    themeId: (() => {
      try {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID
      } catch {
        return DEFAULT_THEME_ID
      }
    })()
  }),
  getters: {
    currentTheme(state): ThemeDefinition | undefined {
      return getThemeById(state.themeId) ?? getThemeById(DEFAULT_THEME_ID)
    },
    allThemes: () => THEMES
  },
  actions: {
    setTheme(themeId: string) {
      const theme = getThemeById(themeId)
      if (!theme) return
      this.themeId = themeId
      try {
        localStorage.setItem(STORAGE_KEY, themeId)
      } catch (_) {}
      this.applyTheme()
    },
    applyTheme() {
      const theme = this.currentTheme
      if (!theme) return
      const root = document.documentElement.style
      root.setProperty('--primary', theme.primary)
      root.setProperty('--primary-hover', theme.primaryHover)
      root.setProperty('--secondary', theme.secondary)
      if (theme.bgDark) root.setProperty('--bg-dark', theme.bgDark)
      if (theme.border) root.setProperty('--border', theme.border)
    }
  }
})
