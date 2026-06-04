import { defineConfig, type Plugin } from 'vite'
import vue, { type Api } from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import devtoolsJson from 'vite-plugin-devtools-json'
import { nitro } from 'nitro/vite'

export default defineConfig((_env) => ({
  plugins: [
    //
    VueRouter({
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
