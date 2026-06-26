import { createSSRApp } from 'vue'
import { createWebHistory, RouterLink, RouterView } from 'vue-router'
import App from './app.vue'
import { createAppRouter } from './router.ts'
import { installPlugins } from './plugins'

async function main() {
  const app = createSSRApp(App)
  const router = createAppRouter(createWebHistory())
  app.use(router)
  app.component('RouterLink', RouterLink)
  app.component('RouterView', RouterView)

  installPlugins({
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
