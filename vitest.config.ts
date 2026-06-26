import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Split into projects (https://vitest.dev/guide/projects) so frontend and
// server tests can run independently.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'server',
          // Plain Node — no Vue/Nitro build plugins, just Node + PGlite.
          environment: 'node',
          include: ['server/**/*.test.ts'],
        },
      },
      {
        resolve: {
          alias: {
            '~': resolve('./app'),
          },
        },
        test: {
          name: 'app',
          // Plain Node — module system tests have no DOM dependency.
          environment: 'node',
          include: ['app/**/*.test.ts'],
        },
      },
      // Vue component tests (uncomment + `pnpm add -D jsdom @vue/test-utils` when needed):
      // {
      //   plugins: [vue()], // import vue from '@vitejs/plugin-vue'
      //   test: {
      //     name: 'app-components',
      //     environment: 'jsdom',
      //     include: ['app/**/*.component.test.ts'],
      //   },
      // },
    ],
  },
})
