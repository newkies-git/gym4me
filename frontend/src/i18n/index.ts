import { createI18n } from 'vue-i18n'
import ko from './ko'
import en from './en'

const savedLocale = localStorage.getItem('locale') || 'ko'

const i18n = createI18n({
    legacy: false,
    locale: savedLocale,
    fallbackLocale: 'en',
    messages: { ko, en },
})

export default i18n
