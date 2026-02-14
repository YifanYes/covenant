import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['server.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  skipNodeModulesBundle: true,
  esbuildPlugins: [
    {
      name: 'fix-prisma-imports',
      setup(build) {
        build.onResolve({ filter: /generated\/prisma/ }, (args) => {
          const path = args.path.endsWith('/index.js') ? args.path : args.path + '/index.js'
          return { path, external: true }
        })
      }
    }
  ]
})
