import { createSSRApp } from 'vue'
import { createWebHistory, RouterLink, RouterView } from 'vue-router'
import { DataLoaderPlugin } from 'vue-router/experimental'
import App from './app.vue'
import { createAppRouter } from './router.ts'
import { installModules } from './modules'
import { isExpectedApiError } from './lib/errors.ts'

// Vite DevTools embedded panel (https://devtools.vite.dev). Its plugin injects the
// bootstrap through `transformIndexHtml`, which never runs here: nitro renders the
// document, so this app has no HTML entry. Replicate the injection — a plain
// `<script>` appended at runtime, so the hub-served module stays out of Vite's graph
// (a static/imported URL makes Vite pre-transform it and breaks the client's
// `import.meta.url`-relative fetches). Dev-only, so production ships nothing.
if (import.meta.env.DEV) {
  const script = document.createElement('script')
  script.type = 'module'
  script.src = '/__devtools/embedded.js'
  document.body.appendChild(script)
}

async function main() {
  const app = createSSRApp(App)
  const router = createAppRouter(createWebHistory())
  // must be before router
  app.use(DataLoaderPlugin, { router, errors: isExpectedApiError })
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
