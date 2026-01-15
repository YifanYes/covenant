import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
      '@/auth': path.resolve(__dirname, './src/components/auth'),
      '@/ui': path.resolve(__dirname, './src/components/ui'),
      '@/common': path.resolve(__dirname, './src/components/common'),
      '@/forms': path.resolve(__dirname, './src/components/forms'),
      '@/layouts': path.resolve(__dirname, './src/layouts'),
      '@/stores': path.resolve(__dirname, './src/stores'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/tasks': path.resolve(__dirname, './src/components/tasks')
    }
  }
})
