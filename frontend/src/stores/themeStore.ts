import { defineStore } from 'pinia'
import { THEMES, getThemeById, DEFAULT_THEME_ID, type ThemeDefinition } from '../theme/themes'

const STORAGE_KEY = 'gym4me_theme_id'
const STORAGE_KEY_COLOR_MODE = 'gym4me_color_mode'

export type ColorMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    themeId: (() => {
      try {
        return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME_ID
      } catch {
        return DEFAULT_THEME_ID
      }
    })(),
    colorMode: ((): ColorMode => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_COLOR_MODE) as ColorMode | null
        return saved === 'dark' || saved === 'light' ? saved : 'light'
      } catch {
        return 'light'
      }
    })()
  }),
  getters: {
    currentTheme(state): ThemeDefinition | undefined {
      return getThemeById(state.themeId) ?? getThemeById(DEFAULT_THEME_ID)
    },
    allThemes: () => THEMES,
    isDark: (state) => state.colorMode === 'dark'
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
    setColorMode(mode: ColorMode) {
      this.colorMode = mode
      try {
        localStorage.setItem(STORAGE_KEY_COLOR_MODE, mode)
      } catch (_) {}
      this.applyTheme()
    },
    applyTheme() {
      const theme = this.currentTheme
      if (!theme) return
      const root = document.documentElement
      root.style.setProperty('--primary', theme.primary)
      root.style.setProperty('--primary-hover', theme.primaryHover)
      root.style.setProperty('--secondary', theme.secondary)
      if (theme.bgDark) root.style.setProperty('--bg-dark', theme.bgDark)
      if (theme.border) root.style.setProperty('--border', theme.border)
      root.setAttribute('data-color-mode', this.colorMode)
    }
  }
})
