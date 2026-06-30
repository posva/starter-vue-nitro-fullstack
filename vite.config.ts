import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue, { type Api } from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import vueRouter from 'vue-router/vite'
import devtoolsJson from 'vite-plugin-devtools-json'
import bundleAnalyzer from 'vite-bundle-analyzer'
import { nitro } from 'nitro/vite'

// Resolve a dist file to an absolute path via real module resolution: find the
// package root (its package.json is always exported) and join the dist file.
// Hardcoding `node_modules/<pkg>/...` only works when packages are hoisted to the
// top level — they are locally, but NOT on Vercel's clean pnpm install, where they
// live under `node_modules/.pnpm/`. This follows the symlinked store either way.
const require = createRequire(import.meta.url)
const r = (pkg: string, file: string) => join(dirname(require.resolve(pkg + '/package.json')), file)

// Absolute path to this config's directory (the project root), used to mirror
// tsconfig's `~/* -> app/*` path mapping for runtime module resolution.
const rootDir = dirname(fileURLToPath(import.meta.url))

// Force Vue's ESM (esm-bundler) builds on the server: Node/SSR resolution otherwise picks the
// `node` export condition → CJS, which tree-shakes worse (~12KB gzip larger server bundle).
// `nitro({ alias })` is the only knob the nitro build honors, but it applies the map *globally* —
// `clientVueRuntime()` below walks back the one harmful entry (`vue` → full build) for the client
// so the browser keeps the runtime-only build.
//
// CRITICAL — this only works together with `environments.ssr.build.rolldownOptions.external` below.
// The aliases rewrite `vue` to an *absolute path*, which makes Vite treat it as a local file and
// INLINE it into the SSR app bundle. The nitro build then bundles a SECOND Vue copy for Pinia →
// two reactivity systems → Pinia's active-instance / `inject` / store reactivity register against
// a Vue the app never renders with → Pinia silently breaks during SSR. Keeping Vue external in the
// SSR build leaves a bare `import … from 'vue'` for the nitro build to resolve exactly ONCE, shared
// by the SSR app entry and the Pinia/Pinia-Colada lib chunk. (The plain CJS build dedupes on its
// own because CommonJS Vue collapses into a single shared module; the split ESM modules do not.)
// TODO: remove `vueServerAliases` (+ the `r` helper, `clientVueRuntime()`, and the SSR `external`)
// once Vue ships ESM-only packages — natural resolution then gives the right builds with no
// aliasing. See https://github.com/vuejs/core/pull/15000 (verified working against it).
const vueServerAliases = {
  // Runtime-only build (no template compiler — SSR renders precompiled SFCs). Just the esm-bundler
  // `vue` is not enough: it only re-exports `@vue/runtime-dom`, so the whole @vue/* runtime graph
  // must be aliased to esm-bundler too (below) or it falls back to CJS via the `node` condition.
  vue: r('vue', 'dist/vue.runtime.esm-bundler.js'),
  // Route BOTH server-renderer specifiers to the esm-bundler build. The app imports
  // `vue/server-renderer`, whose default `vue/server-renderer/index.mjs` is a wrapper around the
  // *CJS* server-renderer (which `require`s the *CJS* Vue) — that would drag a second, CJS Vue
  // runtime into the bundle alongside the esm-bundler one, so `renderToString` would run on a
  // different Vue than the app renders with. The esm-bundler server-renderer imports the bare `vue`
  // specifier instead (→ the single esm-bundler instance) and only pulls stateless `@vue/shared`
  // helpers, so a separate `@vue/shared` copy is harmless.
  'vue/server-renderer': r('@vue/server-renderer', 'dist/server-renderer.esm-bundler.js'),
  '@vue/server-renderer': r('@vue/server-renderer', 'dist/server-renderer.esm-bundler.js'),
  '@vue/shared': r('@vue/shared', 'dist/shared.esm-bundler.js'),
  // The esm-bundler `vue` only re-exports `@vue/runtime-dom`, which (left bare) resolves via the
  // `node` condition to the CJS runtime — defeating tree-shaking. Alias the whole @vue/* runtime
  // graph to esm-bundler so the server gets the real, tree-shakeable ESM runtime.
  '@vue/reactivity': r('@vue/reactivity', 'dist/reactivity.esm-bundler.js'),
  '@vue/runtime-core': r('@vue/runtime-core', 'dist/runtime-core.esm-bundler.js'),
  '@vue/runtime-dom': r('@vue/runtime-dom', 'dist/runtime-dom.esm-bundler.js'),
  // Pinia's `node` export condition resolves even `import` to `dist/pinia.prod.cjs` (CJS), so the
  // server would otherwise `require('vue')` while the app `import`s it — different consumption of
  // the same file can split into two instances. Force Pinia's ESM build so it `import`s the bare
  // `vue` specifier exactly like the app. (@pinia/colada is already ESM-only.)
  // pinia: r('pinia', 'dist/pinia.mjs'),
}

export default defineConfig((env) => ({
  optimizeDeps: {
    exclude: ['pinia'],
  },
  resolve: {
    alias: {
      // Mirror tsconfig's `~/* -> app/*` so first-party imports like
      // `~/queries/users` resolve at runtime too (the nitro SSR build does not
      // read tsconfig path mappings).
      '~': join(rootDir, 'app'),
    },
  },
  plugins: [
    //
    vueRouter({
      routesFolder: 'app/pages',
      dts: './app/routes.d.ts',
      experimental: {
        autoExportsDataLoaders: 'app/loaders',
        paramParsers: {
          dir: 'app/params',
        },
      },
      // SSR per-route asset injection: stash a serializable key in meta so entry-server can
      // resolve `?assets` via import.meta.glob (functions can't survive the JSON-serialized meta).
      extendRoute(route) {
        const file = route.component
        if (file) route.addToMeta({ assetsKey: './pages' + file.split('/pages').pop() })
      },
    }),
    bundleAnalyzer({
      enabled: false,
      summary: true,
    }),
    patchVueExclude(vue(), /\?assets/),
    // Nuxt UI: registers Tailwind v4, the icon resolver, and the virtual
    // `@nuxt/ui/vue-plugin` module installed in app/modules/ui.ts.
    // Auto-import is disabled — components are imported explicitly from
    // `@nuxt/ui/components/*.vue` and composables from `@nuxt/ui/composables`.
    // NOTE: `UIcon`/`ULink` must be imported from `@nuxt/ui/runtime/vue/components/*`
    // (the Vue-compatible overrides). The plain `components/Icon.vue` pulls in
    // `@nuxt/icon`'s `svg.js`, which imports Nuxt-only helpers from `#imports`.
    ui({ autoImport: false, components: false }),
    // clientVueRuntime(),
    devtoolsJson(),
    nitro({
      serverDir: './server',
      // alias: env.command === 'build' ? vueServerAliases : {},
      plugins:
        // automatically applies db migrations during dev
        env.mode === 'development' ? ['./server/database/dev-migration-plugin.ts'] : [],
    }),
  ],
  environments: {
    client: {
      build: {
        rolldownOptions: {
          input: './app/entry-client.ts',
        },
      },
    },
    ssr: {
      resolve: {
        // Inline Nuxt UI so Vite's pipeline (the `ui()` plugin) resolves its
        // internal `#imports` specifier. Left external, Node resolves the bare
        // `#imports` import inside @nuxt/ui's runtime files and throws.
        noExternal: ['@nuxt/ui'],
      },
      build: {
        rolldownOptions: {
          input: './app/entry-server.ts',
          // Keep Vue EXTERNAL in the SSR app build so it is NOT inlined into the app bundle.
          // Otherwise the app carries its own private Vue copy while the nitro build bundles a
          // SECOND copy for Pinia → two reactivity systems → Pinia breaks during SSR. Marking it
          // external leaves the import in the SSR output so the nitro build resolves Vue exactly
          // ONCE, shared by the SSR app entry and the Pinia/Pinia-Colada lib chunk.
          //
          // `nitro({ alias })` applies `vueServerAliases` globally (incl. this SSR build) and
          // rewrites the bare specifiers to absolute paths, so match BOTH the bare names and any
          // resolved `…/vue/dist`, `…/vue/server-renderer`, `…/@vue/<pkg>/dist` path. (Vite's
          // `resolve.external` is ignored by the nitro-managed SSR environment; the lower-level
          // rollup `external` is honored because `build.rolldownOptions` is.)
          // external: [
          //   'vue',
          //   'vue/server-renderer',
          //   '@vue/server-renderer',
          //   '@vue/shared',
          //   /[/\\](?:vue[/\\](?:dist|server-renderer)|@vue[/\\][^/\\]+[/\\]dist)[/\\]/,
          // ],
        },
      },
    },
    nitro: {
      resolve: {
        // Same as ssr: keep Nuxt UI inlined so `#imports` is resolved by Vite,
        // not by the nitro/Node runtime (which has no `#imports` mapping).
        noExternal: ['@nuxt/ui'],
      },
      build: {
        rolldownOptions: {
          // To inspect the server bundle, add:
          //   import { adapter, analyzer } from 'vite-bundle-analyzer'
          //   plugins: [adapter(analyzer())],
          treeshake: {
            // Assume no side effects (smaller bundle) EXCEPT reflect-metadata, whose
            // whole job is the global `Reflect.*Metadata` patch tsyringe needs at import.
            moduleSideEffects: (id) => id.includes('reflect-metadata'),
          },
        },
      },
    },
  },
}))

// `nitro({ alias })` injects its alias map as a *global* `resolve.alias`, so the
// full `vue.esm-bundler.js` (with the runtime template compiler) leaks into the
// client build too. Redirect `vue` back to the runtime-only build for the client
// environment only, before the alias plugin runs (~36KB gzip off the browser bundle).
// TODO: remove together with `vueServerAliases` once Vue is ESM-only.
// See https://github.com/vuejs/core/pull/15000
function clientVueRuntime(): Plugin {
  const full = r('vue', 'dist/vue.esm-bundler.js')
  const runtime = r('vue', 'dist/vue.runtime.esm-bundler.js')
  return {
    name: 'client-vue-runtime',
    enforce: 'pre',
    // The global alias has already rewritten `vue` → the full build by the time this
    // runs, so match the resolved path (not the `vue` specifier) and swap it.
    resolveId(id) {
      if ((id === 'vue' || id === full) && this.environment?.name === 'client') return runtime
      return undefined
    },
  }
}

// Workaround https://github.com/vitejs/vite-plugin-vue/issues/677
function patchVueExclude(plugin: Plugin<Api>, exclude: RegExp) {
  if (typeof plugin.transform !== 'object' || !plugin.transform) {
    throw new Error('Plugin does not have a transform handler to patch')
  }
  const original = plugin.transform.handler
  plugin.transform.handler = function (...args) {
    if (exclude.test(args[1])) return
    return original.call(this, ...args)
  }
  return plugin
}
