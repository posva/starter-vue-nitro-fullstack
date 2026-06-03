import { createSSRApp } from 'vue'
import { createWebHistory } from 'vue-router'
import App from './app.vue'
import { createAppRouter } from './router.ts'

async function main() {
  const app = createSSRApp(App)
  const router = createAppRouter(createWebHistory())
  app.use(router)

  await router.isReady()
  app.mount('#root')
}

// eslint-disable-next-line unicorn/prefer-top-level-await
main()
