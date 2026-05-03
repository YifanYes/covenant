'use client'

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
      language: 'en',
      defaultTasksView: 'list',
      setLanguage: (language: string) => set({ language }),
      setDefaultTasksView: (defaultTasksView: string) => set({ defaultTasksView }),
      setPreferences: (preferences: { language: string; defaultTasksView: string }) => set(preferences)
    }),
    {
      name: 'covenant-user-preferences',
      skipHydration: typeof window === 'undefined'
    }
  )
)
