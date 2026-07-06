import { createSSRApp } from 'vue'
import { createWebHistory, RouterLink, RouterView } from 'vue-router'
import App from './app.vue'
import { createAppRouter } from './router.ts'
import { installModules } from './modules'

// Vite DevTools embedded panel (https://devtools.vite.dev). This app has no HTML
// entry (nitro renders the document), so the client must be injected from the
// browser entry. Dev-only dynamic import keeps it out of the production bundle.
if (import.meta.env.DEV) {
  import('@vitejs/devtools/client/inject')
}

async function main() {
  const app = createSSRApp(App)
  const router = createAppRouter(createWebHistory())
  app.use(router)
  app.component('RouterLink', RouterLink)
  app.component('RouterView', RouterView)

  installModules({
    app,
    router,
    // cannot type because of the overloads
    getInitialState: () => (window.__INITIAL_STATE__ as any) || {},
  })

  await router.isReady()
  app.mount('#root')
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main()
