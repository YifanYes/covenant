import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['server.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  skipNodeModulesBundle: true,
  external: [/generated\/prisma/],
})
