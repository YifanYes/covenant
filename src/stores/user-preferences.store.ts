'use client'

import { DATE_FORMATS } from '@shared/schemas/auth.schemas'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export { DATE_FORMATS }
export type DateFormat = (typeof DATE_FORMATS)[number]

type TabVisibility = {
  showListTab: boolean
  showKanbanTab: boolean
  showTableTab: boolean
  showMatrixTab: boolean
  showTodayTab: boolean
  showHabitsListTab: boolean
  showGridTab: boolean
  showHeatmapTab: boolean
}

type UserPreferencesStore = TabVisibility & {
  language: string
  defaultTasksView: string
  defaultHabitsView: string
  dateFormat: DateFormat
  setLanguage: (language: string) => void
  setDateFormat: (format: DateFormat) => void
  setPreferences: (
    preferences: Partial<{
      language: string
      defaultTasksView: string
      defaultHabitsView: string
      dateFormat: DateFormat
    }> &
      Partial<TabVisibility>
  ) => void
}

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set) => ({
      language: 'en',
      defaultTasksView: 'list',
      defaultHabitsView: 'today',
      dateFormat: 'L',
      showListTab: true,
      showKanbanTab: true,
      showTableTab: true,
      showMatrixTab: true,
      showTodayTab: true,
      showHabitsListTab: true,
      showGridTab: true,
      showHeatmapTab: true,
      setLanguage: (language: string) => set({ language }),
      setDateFormat: (dateFormat: DateFormat) => set({ dateFormat }),
      setPreferences: (preferences) => set(preferences)
    }),
    {
      name: 'covenant-user-preferences',
      skipHydration: typeof window === 'undefined'
    }
  )
)
