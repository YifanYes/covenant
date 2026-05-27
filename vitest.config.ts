import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const sharedInclude = ['src/server/__tests__/**/*.test.ts', 'src/shared/__tests__/**/*.test.ts']
const integrationGlob = '**/*.integration.test.ts'

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          include: sharedInclude,
          exclude: [integrationGlob]
        }
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'integration',
          globals: true,
          environment: 'node',
          include: [`src/server/__tests__/${integrationGlob}`, `src/shared/__tests__/${integrationGlob}`]
        }
      }
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/server/**/*.ts', 'src/shared/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.d.ts',
        'src/generated/**',
        'src/shared/schemas/**',
        'src/server/scripts/**'
      ],
      // Baselines set to current floor minus small buffer — catches regressions, ratchet up over time
      thresholds: {
        'src/server/services/**/*.ts': {
          statements: 75,
          branches: 65,
          functions: 70,
          lines: 75
        },
        'src/server/utils/**/*.ts': {
          statements: 60,
          branches: 35,
          functions: 75,
          lines: 60
        }
      }
    }
  }
})
