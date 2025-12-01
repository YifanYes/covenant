import i18n from '@/i18n'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserPreferencesStore = {
  language: string
  defaultTasksView: string
  setLanguage: (language: string) => void
  setDefaultTasksView: (view: string) => void
  setPreferences: (preferences: { language: string; defaultTasksView: string }) => void
}

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set) => ({
      language: i18n.resolvedLanguage || 'en',
      defaultTasksView: 'list',
      setLanguage: (language: string) => set({ language }),
      setDefaultTasksView: (defaultTasksView: string) => set({ defaultTasksView }),
      setPreferences: (preferences: { language: string; defaultTasksView: string }) => set(preferences)
    }),
    { name: 'arq-user-preferences' }
  )
)
