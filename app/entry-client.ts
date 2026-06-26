import { createSSRApp } from 'vue'
import { createWebHistory, RouterLink, RouterView } from 'vue-router'
import App from './app.vue'
import { createAppRouter } from './router.ts'
import { installPlugins } from './plugins'
import { InitialStateClient } from './initial-state.ts'

async function main() {
  const app = createSSRApp(App)
  const router = createAppRouter(createWebHistory())
  app.use(router)
  app.component('RouterLink', RouterLink)
  app.component('RouterView', RouterView)

  const initialState = new InitialStateClient(window.__INITIAL_STATE__ || {})
  installPlugins({
    app,
    router,
    isClient: true,
    // TODO: just use window.__INITIAL_STATE__ directly instead of wrapping it in a class
    getInitialState: () => initialState as any,
  })

  await router.isReady()
  app.mount('#root')
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main()
