/// <reference types="nitro/vite" />
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, RouterLink, RouterView } from 'vue-router'
import { createHead, transformHtmlTemplate } from '@unhead/vue/server'

import App from './app.vue'
import { createAppRouter } from './router.ts'
import { installModules, createRenderedHook } from './modules'

import clientAssets from './entry-client.ts?assets=client'
import { InitialStateServer } from './initial-state.ts'
import { inlineCriticalCss } from './lib/critical-css.ts'

const assetsModules = import.meta.glob('./pages/**/*.vue', { query: '?assets' })

async function handler(request: Request): Promise<Response> {
  const app = createSSRApp(App)
  const router = createAppRouter(createMemoryHistory())
  app.component('RouterLink', RouterLink)
  app.component('RouterView', RouterView)
  app.use(router)

  // Install the head BEFORE modules so Nuxt UI reuses it (it only creates its own
  // client head when `usehead` isn't provided yet) and component tags reach SSR.
  const head = createHead()
  app.use(head)

  const initialState = new InitialStateServer()
  const { onRendered, runRendered } = createRenderedHook()
  installModules({
    app,
    router,
    // cannot type because of the overloads
    getInitialState: () => initialState as any,
    request,
    onRendered,
  })

  const url = new URL(request.url)
  const href = url.href.slice(url.origin.length)

  await router.push(href)
  await router.isReady()

  const assets = clientAssets.merge(
    (await import('./app.vue?assets')).default,
    ...(await Promise.all(
      router.currentRoute.value.matched
        .map((to) => to.meta.assetsKey)
        .filter((v): v is string => !!v)
        .map((key) => assetsModules[key]?.().then((m: any) => m.default)),
    )),
  )

  head.push({
    link: [
      ...assets.css.map((attrs: any) => ({ rel: 'stylesheet', ...attrs })),
      // oxlint-disable-next-line no-map-spread
      ...assets.js.map((attrs: any) => ({ rel: 'modulepreload', ...attrs })),
    ],
    script: [{ type: 'module', src: clientAssets.entry }],
  })

  const renderedApp = await renderToString(app)
  runRendered()

  // Serialize the SSR state so the client can rehydrate. Injected as a classic
  // (non-module) script so it runs before the deferred client entry module.
  head.push({
    script: [{ innerHTML: `window.__INITIAL_STATE__=${initialState}` }],
  })

  let html = await transformHtmlTemplate(head, htmlTemplate(renderedApp))

  // Skipped in dev (styles go through Vite's module graph, no links to inline).
  // Pages can opt out via `definePage({ meta: { criticalCss: false } })`.
  const criticalCss = !router.currentRoute.value.matched.some(
    (record) => record.meta.criticalCss === false,
  )
  if (!import.meta.env.DEV && criticalCss) {
    html = await inlineCriticalCss(html, url.origin)
  }

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=utf-8' },
  })
}

function htmlTemplate(body: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vue + Nitro</title>
  <!-- Apply the persisted color scheme before paint so there is no light/dark
       flash. Mirrors @vueuse/core's useDark (key 'vueuse-color-scheme', default
       'auto' → follow the OS), which Nuxt UI's color-mode plugin then takes over. -->
  <script>
    (function () {
      try {
        var p = localStorage.getItem('vueuse-color-scheme') || 'auto'
        var dark = p === 'dark' || (p === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches)
        document.documentElement.classList.toggle('dark', dark)
      } catch (e) {}
    })()
  </script>
</head>
<body>
  <div id="root">${body}</div>
</body>
</html>`
}

export default {
  fetch: handler,
}
