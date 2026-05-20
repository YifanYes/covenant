'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SidebarUIStore = {
  sectionsOpen: Record<string, boolean>
  setSectionOpen: (id: string, open: boolean) => void
}

export const useSidebarUIStore = create<SidebarUIStore>()(
  persist(
    (set) => ({
      sectionsOpen: {},
      setSectionOpen: (id, open) =>
        set((state) => ({
          sectionsOpen: { ...state.sectionsOpen, [id]: open }
        }))
    }),
    {
      name: 'covenant-sidebar-ui',
      skipHydration: typeof window === 'undefined',
      partialize: (state) => ({ sectionsOpen: state.sectionsOpen })
    }
  )
)
