'use client'

import dayjs from 'dayjs'
import 'dayjs/locale/es'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'
import { initReactI18next } from 'react-i18next'

dayjs.extend(LocalizedFormat)

if (typeof window !== 'undefined') {
  i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false
      },
      supportedLngs: ['en', 'es'],
      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json',
      },
    })

  i18n.on('languageChanged', (lng) => dayjs.locale(lng))
}

export default i18n
