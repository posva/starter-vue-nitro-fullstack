import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import vue, { type Api } from '@vitejs/plugin-vue'
import vueRouter from 'vue-router/vite'
import { adapter, analyzer } from 'vite-bundle-analyzer'
import devtoolsJson from 'vite-plugin-devtools-json'
import { nitro } from 'nitro/vite'

// Resolve a dist file to an absolute path via real module resolution: find the
// package root (its package.json is always exported) and join the dist file.
// Hardcoding `node_modules/<pkg>/...` only works when packages are hoisted to the
// top level — they are locally, but NOT on Vercel's clean pnpm install, where they
// live under `node_modules/.pnpm/`. This follows the symlinked store either way.
const require = createRequire(import.meta.url)
const r = (pkg: string, file: string) => join(dirname(require.resolve(pkg + '/package.json')), file)

// Force Vue's ESM (esm-bundler) builds on the server: Node/SSR resolution otherwise
// picks the `node` export condition → CJS, which tree-shakes worse (~12KB gzip larger
// server bundle). `nitro({ alias })` is the only knob the nitro build honors, but it
// applies the map *globally* — `clientVueRuntime()` below walks back the one harmful
// entry (`vue` → full build) for the client so the browser keeps the runtime-only build.
const vueServerAliases = {
  vue: r('vue', 'dist/vue.esm-bundler.js'),
  'vue/server-renderer': r('vue', 'server-renderer/index.mjs'),
  '@vue/server-renderer': r('@vue/server-renderer', 'dist/server-renderer.esm-bundler.js'),
  '@vue/reactivity': r('@vue/reactivity', 'dist/reactivity.esm-bundler.js'),
  '@vue/shared': r('@vue/shared', 'dist/shared.esm-bundler.js'),
  '@vue/runtime-core': r('@vue/runtime-core', 'dist/runtime-core.esm-bundler.js'),
  '@vue/runtime-dom': r('@vue/runtime-dom', 'dist/runtime-dom.esm-bundler.js'),
  '@vue/compiler-core': r('@vue/compiler-core', 'dist/compiler-core.esm-bundler.js'),
  '@vue/compiler-dom': r('@vue/compiler-dom', 'dist/compiler-dom.esm-bundler.js'),
  '@vue/compiler-ssr': r('@vue/compiler-ssr', 'dist/compiler-ssr.cjs.js'),
  '@vue/compiler-sfc': r('@vue/compiler-sfc', 'dist/compiler-sfc.esm-browser.js'),
}

export default defineConfig((env) => ({
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
    patchVueExclude(vue(), /\?assets/),
    clientVueRuntime(),
    devtoolsJson(),
    nitro({
      serverDir: './server',
      alias: vueServerAliases,
      plugins:
        // automatically applies db migrations during dev
        env.mode === 'development' ? ['./server/database/dev-migration-plugin.ts'] : [],
    }),
  ],
  environments: {
    client: {
      build: {
        rollupOptions: {
          input: './app/entry-client.ts',
        },
      },
    },
    ssr: {
      build: {
        rollupOptions: {
          input: './app/entry-server.ts',
        },
      },
    },
    nitro: {
      build: {
        rollupOptions: {
          // plugins: [adapter(analyzer())],
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
