import { supabase } from '@/lib/supabase.lib'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthStore = {
  email: string
  userId: string
  isLoading: boolean
  updateUserInfo: (userInfo: { email: string; userId: string }) => void
  resetUserInfo: () => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      email: '',
      userId: '',
      isLoading: true,
      updateUserInfo: ({ email, userId }: { email: string; userId: string }) => set({ email, userId }),
      resetUserInfo: () => set({ email: '', userId: '' }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      signOut: async () => {
        await supabase.auth.signOut()
        set({ email: '', userId: '' })
      }
    }),
    {
      name: 'arq-store',
      partialize: (state) => ({ email: state.email, userId: state.userId })
    }
  )
)
