import { defineConfig, type Plugin } from 'vite'
import vue, { type Api } from '@vitejs/plugin-vue'
import devtoolsJson from 'vite-plugin-devtools-json'
import { nitro } from 'nitro/vite'

export default defineConfig((_env) => ({
  plugins: [
    //
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
