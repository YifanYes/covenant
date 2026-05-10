'use client'

import { DATE_FORMATS } from '@shared/schemas/auth.schemas'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export { DATE_FORMATS }
export type DateFormat = (typeof DATE_FORMATS)[number]

type UserPreferencesStore = {
  language: string
  defaultTasksView: string
  dateFormat: DateFormat
  setLanguage: (language: string) => void
  setDefaultTasksView: (view: string) => void
  setDateFormat: (format: DateFormat) => void
  setPreferences: (preferences: { language: string; defaultTasksView: string; dateFormat: DateFormat }) => void
}

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set) => ({
      language: 'en',
      defaultTasksView: 'list',
      dateFormat: 'L',
      setLanguage: (language: string) => set({ language }),
      setDefaultTasksView: (defaultTasksView: string) => set({ defaultTasksView }),
      setDateFormat: (dateFormat: DateFormat) => set({ dateFormat }),
      setPreferences: (preferences: { language: string; defaultTasksView: string; dateFormat: DateFormat }) =>
        set(preferences)
    }),
    {
      name: 'covenant-user-preferences',
      skipHydration: typeof window === 'undefined'
    }
  )
)
