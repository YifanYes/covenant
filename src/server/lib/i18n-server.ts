import i18n from 'i18next'
import enTranslation from '@/public/locales/en/translation.json'
import esTranslation from '@/public/locales/es/translation.json'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './auth-locale.utils'

const instance = i18n.createInstance()

instance.init({
  resources: {
    en: { translation: enTranslation },
    es: { translation: esTranslation }
  },
  fallbackLng: DEFAULT_LOCALE,
  interpolation: {
    escapeValue: false
  },
  supportedLngs: [...SUPPORTED_LOCALES]
})

export async function createServerI18n(lng: string) {
  const clone = instance.cloneInstance({ lng })
  return clone
}

export default instance
