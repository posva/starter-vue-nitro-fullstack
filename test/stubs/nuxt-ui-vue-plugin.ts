import type { Plugin } from 'vue'

// Stub for the `@nuxt/ui/vue-plugin` virtual module, which only exists when the
// `@nuxt/ui/vite` plugin is running (see vite.config.ts). The plugin-less
// vitest environment cannot resolve it, yet importing `app/modules/index.ts`
// pulls in every sibling module eagerly (via `import.meta.glob`), `ui.ts`
// included. This no-op plugin lets those imports resolve in tests.
const stub: Plugin = {
  install() {},
}

export default stub
