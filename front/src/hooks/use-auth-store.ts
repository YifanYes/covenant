import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type AuthStore = {
  email: string
  userId: string
  accessToken: string
  refreshToken: string
  updateUserInfo: (userInfo: { email: string; userId: string; accessToken: string; refreshToken: string }) => void
  resetUserInfo: () => void
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      email: '',
      userId: '',
      accessToken: '',
      refreshToken: '',
      updateUserInfo: ({
        email,
        userId,
        accessToken,
        refreshToken
      }: {
        email: string
        userId: string
        accessToken: string
        refreshToken: string
      }) => set({ email, userId, accessToken, refreshToken }),
      resetUserInfo: () => set({ email: '', userId: '', accessToken: '', refreshToken: '' }),
      setTokens: ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) =>
        set({ accessToken, refreshToken })
    }),
    {
      name: 'arq-store'
    }
  )
)
