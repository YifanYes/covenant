'use client'

import dayjs from 'dayjs'
import 'dayjs/locale/es'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enTranslation from '@/public/locales/en/translation.json'
import esTranslation from '@/public/locales/es/translation.json'

dayjs.extend(LocalizedFormat)
dayjs.extend(relativeTime)

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      es: {
        translation: esTranslation
      }
    },
    fallbackLng: 'es',
    interpolation: {
      escapeValue: false
    },
    supportedLngs: ['en', 'es']
  })

dayjs.locale(i18n.language)

i18n.on('languageChanged', (lng) => dayjs.locale(lng))

export default i18n
