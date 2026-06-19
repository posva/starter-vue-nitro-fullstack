import { defineConfig, type Plugin } from 'vite'
import vue, { type Api } from '@vitejs/plugin-vue'
import vueRouter from 'vue-router/vite'
import { adapter, analyzer } from 'vite-bundle-analyzer'
import devtoolsJson from 'vite-plugin-devtools-json'
import { nitro } from 'nitro/vite'

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
    devtoolsJson(),
    nitro({
      serverDir: './server',
      alias: {
        vue: './node_modules/vue/dist/vue.esm-bundler.js',
        'vue/server-renderer': './node_modules/vue/server-renderer/index.mjs',
        '@vue/server-renderer':
          './node_modules/@vue/server-renderer/dist/server-renderer.esm-bundler.js',
        '@vue/reactivity': './node_modules/@vue/reactivity/dist/reactivity.esm-bundler.js',
        '@vue/shared': './node_modules/@vue/shared/dist/shared.esm-bundler.js',
        '@vue/runtime-core': './node_modules/@vue/runtime-core/dist/runtime-core.esm-bundler.js',
        '@vue/runtime-dom': './node_modules/@vue/runtime-dom/dist/runtime-dom.esm-bundler.js',
        '@vue/compiler-core': './node_modules/@vue/compiler-core/dist/compiler-core.esm-bundler.js',
        '@vue/compiler-dom': './node_modules/@vue/compiler-dom/dist/compiler-dom.esm-bundler.js',
        '@vue/compiler-ssr': './node_modules/@vue/compiler-ssr/dist/compiler-ssr.cjs.js',
        '@vue/compiler-sfc': './node_modules/@vue/compiler-sfc/dist/compiler-sfc.esm-browser.js',
      },
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
            moduleSideEffects: () => false,
          },
        },
      },
    },
  },
}))

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
