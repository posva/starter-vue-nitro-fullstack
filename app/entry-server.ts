/// <reference types="nitro/vite" />
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createMemoryHistory, RouterLink, RouterView } from 'vue-router'
import { createHead, transformHtmlTemplate } from 'unhead/server'

import App from './app.vue'
import { createAppRouter } from './router.ts'
import { installModules, createRenderedHook } from './modules'

import clientAssets from './entry-client.ts?assets=client'
import { InitialStateServer } from './initial-state.ts'

const assetsModules = import.meta.glob('./pages/**/*.vue', { query: '?assets' })

async function handler(request: Request): Promise<Response> {
  const app = createSSRApp(App)
  const router = createAppRouter(createMemoryHistory())
  app.component('RouterLink', RouterLink)
  app.component('RouterView', RouterView)
  app.use(router)

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

  const head = createHead()

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

  const html = await transformHtmlTemplate(head, htmlTemplate(renderedApp))

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
  <title>Vue Router Custom Framework</title>
  <!-- No-flash theme boot: set data-theme + accent before first paint (mirrors use-theme.ts). -->
  <script>
    (function () {
      try {
        var m = localStorage.getItem('theme') || 'system'
        var dark = m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
        var el = document.documentElement
        el.dataset.theme = dark ? 'dark' : 'light'
        var h = localStorage.getItem('accent-hue')
        if (h) el.style.setProperty('--accent-hue', h)
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
