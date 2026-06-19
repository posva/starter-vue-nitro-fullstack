import { createSSRApp } from 'vue'
import { createWebHistory } from 'vue-router'
import App from './app.vue'
import { createAppRouter } from './router.ts'
import { installPlugins } from './plugins'
import { deserializeState } from './serialization.ts'

async function main() {
  const app = createSSRApp(App)
  const router = createAppRouter(createWebHistory())
  app.use(router)

  installPlugins({
    app,
    router,
    isClient: true,
    initialState: window.__INITIAL_STATE__ ? deserializeState(window.__INITIAL_STATE__) : {},
  })

  await router.isReady()
  app.mount('#root')
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main()
