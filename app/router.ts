import type { RouterHistory } from 'vue-router'
import { experimental_createRouter as createRouter } from 'vue-router/experimental'
import { resolver, handleHotUpdate } from 'vue-router/auto-resolver'

export function createAppRouter(history: RouterHistory) {
  const router = createRouter({ history, resolver })

  if (import.meta.hot) {
    handleHotUpdate(router)
  }

  return router
}

declare module 'vue-router' {
  interface TypesConfig {
    Router: ReturnType<typeof createAppRouter>
  }

  interface RouteMeta {
    // serializable key used to resolve the route's `?assets` module during SSR
    assetsKey?: string
    // false skips critical CSS inlining (~20ms of SSR time per request)
    criticalCss?: boolean
  }
}
