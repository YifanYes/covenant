import { QueryClientProvider } from '@tanstack/react-query'
import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n.ts'
import './index.css'
import { Router } from './Router.tsx'
import { queryClient } from './utils/trpc.utils.ts'

dayjs.extend(LocalizedFormat)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  </StrictMode>
)
