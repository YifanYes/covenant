'use client'

import type { TutorialSlideId } from '@shared/schemas/onboarding.schemas'
import { create } from 'zustand'

type TutorialState = {
  queue: TutorialSlideId[]
  sessionTotal: number
  seen: TutorialSlideId[]
  hydrated: boolean
  setSeen: (ids: TutorialSlideId[]) => void
  hasSeen: (id: TutorialSlideId) => boolean
  enqueueIfUnseen: (id: TutorialSlideId) => void
  enqueueMany: (ids: TutorialSlideId[]) => void
  closeCurrent: () => void
  replayAll: () => void
}

const REPLAY_SLIDES: TutorialSlideId[] = ['mana', 'combat', 'gear']

export const useTutorialStore = create<TutorialState>((set, get) => ({
  queue: [],
  sessionTotal: 0,
  seen: [],
  hydrated: false,
  setSeen: (ids) => set({ seen: ids, hydrated: true }),
  hasSeen: (id) => get().seen.includes(id),
  enqueueIfUnseen: (id) => {
    const { hydrated, seen, queue } = get()
    if (!hydrated) return
    if (seen.includes(id)) return
    if (queue.length > 0) return
    set({ queue: [id], sessionTotal: 1 })
  },
  enqueueMany: (ids) => {
    if (ids.length === 0) return
    set({
      queue: [...ids],
      sessionTotal: ids.length,
      hydrated: true
    })
  },
  closeCurrent: () => {
    const { queue } = get()
    if (queue.length === 0) return
    const nextQueue = queue.slice(1)
    set({
      queue: nextQueue,
      sessionTotal: nextQueue.length === 0 ? 0 : get().sessionTotal
    })
  },
  replayAll: () =>
    set({
      queue: [...REPLAY_SLIDES],
      sessionTotal: REPLAY_SLIDES.length,
      seen: [],
      hydrated: true
    })
}))
