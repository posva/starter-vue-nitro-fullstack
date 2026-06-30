import { defineModule } from './types.ts'
import ui from '@nuxt/ui/vue-plugin'

// Setup Nuxt UI. Registers the global `U*` components, the color-mode plugin
// (@vueuse/core `useDark`, toggling `.dark` on <html>), unhead, and vue-router
// integration. `@nuxt/ui/vue-plugin` is a virtual module emitted by the `ui()`
// Vite plugin (see vite.config.ts).
// https://ui.nuxt.com/
export default defineModule(({ app }) => {
  app.use(ui)
})
