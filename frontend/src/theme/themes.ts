/**
 * Berry-Vuertify 스타일 프리셋 테마 (gym4me CSS 변수 매핑)
 * 라이선스: berry-vuertify-vuejs 참고하여 다수 테마 제공
 */

export interface ThemeDefinition {
  id: string
  nameKey: string
  primary: string
  primaryHover: string
  secondary: string
  bgDark?: string
  border?: string
}

const createTheme = (
  id: string,
  nameKey: string,
  primary: string,
  primaryHover: string,
  secondary: string,
  bgDark?: string,
  border?: string
): ThemeDefinition => ({
  id,
  nameKey,
  primary,
  primaryHover,
  secondary,
  bgDark,
  border
})

export const THEMES: ThemeDefinition[] = [
  createTheme('berry', 'theme.berry', '#5e35b1', '#4527a0', '#1e88e5', '#eef2f6', '#e3e8ef'),
  createTheme('ocean', 'theme.ocean', '#1565c0', '#0d47a1', '#42a5f5', '#e3f2fd', '#bbdefb'),
  createTheme('forest', 'theme.forest', '#2e7d32', '#1b5e20', '#66bb6a', '#e8f5e9', '#c8e6c9'),
  createTheme('rose', 'theme.rose', '#c2185b', '#880e4f', '#ec407a', '#fce4ec', '#f8bbd9'),
  createTheme('amber', 'theme.amber', '#ef6c00', '#e65100', '#ff9800', '#fff3e0', '#ffe0b2'),
  createTheme('teal', 'theme.teal', '#00695c', '#004d40', '#26a69a', '#e0f2f1', '#b2dfdb'),
  createTheme('indigo', 'theme.indigo', '#3949ab', '#283593', '#5c6bc0', '#e8eaf6', '#c5cae9'),
  createTheme('coral', 'theme.coral', '#d84315', '#bf360c', '#ff5722', '#fbe9e7', '#ffccbc'),
]

export const DEFAULT_THEME_ID = 'berry'

export function getThemeById(id: string): ThemeDefinition | undefined {
  return THEMES.find((t) => t.id === id)
}
