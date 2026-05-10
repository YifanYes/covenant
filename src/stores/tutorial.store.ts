'use client'

import { create } from 'zustand'

type TutorialState = {
  manuallyClosed: boolean
  setClosed: () => void
  reopen: () => void
}

export const useTutorialStore = create<TutorialState>((set) => ({
  manuallyClosed: false,
  setClosed: () => set({ manuallyClosed: true }),
  reopen: () => set({ manuallyClosed: false })
}))
