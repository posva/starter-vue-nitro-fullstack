import { defineConfig } from 'vitest/config'

// Split into projects (https://vitest.dev/guide/projects) so frontend tests can
// be added later without disturbing the server suite. Today only `server` runs;
// the commented `app` project is the slot for future Vue component tests.
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
      // Frontend tests (uncomment + `pnpm add -D jsdom @vue/test-utils` when needed):
      // {
      //   plugins: [vue()], // import vue from '@vitejs/plugin-vue'
      //   test: {
      //     name: 'app',
      //     environment: 'jsdom',
      //     include: ['app/**/*.test.ts'],
      //   },
      // },
    ],
  },
})
