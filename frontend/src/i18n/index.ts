import { createI18n } from 'vue-i18n'
import ko from './ko'
import en from './en'

const supportedLocales = ['ko', 'en'] as const
const savedLocale =
  typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function'
    ? localStorage.getItem('locale')
    : null
const locale = supportedLocales.includes(savedLocale as 'ko' | 'en') ? savedLocale! : 'ko'

const i18n = createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'ko',
    messages: { ko, en },
})

export default i18n
