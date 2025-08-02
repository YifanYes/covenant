import { create } from 'zustand'

export type SnackbarVariant = 'default' | 'destructive' | 'success'

type SnackbarInput = {
  variant: SnackbarVariant
  title: string
  description?: string
  duration?: number
}

type SnackbarState = {
  open: boolean
  variant: SnackbarVariant
  title: string
  description?: string
  show: (input: SnackbarInput) => void
  hide: () => void
}

let hideTimer: ReturnType<typeof setTimeout> | undefined

export const useSnackbar = create<SnackbarState>((set, get) => ({
  open: false,
  variant: 'default',
  title: '',
  description: undefined,
  show: ({ variant, title, description, duration = 2500 }: SnackbarInput) => {
    if (hideTimer) clearTimeout(hideTimer)
    set({ open: true, variant, title, description })
    if (duration > 0) {
      hideTimer = setTimeout(() => {
        if (get().open) set({ open: false })
      }, duration)
    }
  },
  hide: () => {
    if (hideTimer) clearTimeout(hideTimer)
    set({ open: false })
  }
}))
