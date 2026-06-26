import { createPinia, shouldHydrate } from 'pinia'
import { defineModule } from './types.ts'
import { parse, stringify } from 'devalue'
import { toRaw } from 'vue'

// Setup Pinia
// https://pinia.vuejs.org/
export default defineModule(({ app, getInitialState }) => {
  const pinia = createPinia()
  app.use(pinia)

  if (import.meta.env.SSR) {
    const state = getInitialState(import.meta.env.SSR)
    state.add('pinia', () => {
      // toRaw is needed to get access to some internal properties
      const data = stringify(toRaw(pinia.state.value), {
        // skip special values in pinia stores
        skipHydrate: (data: unknown) => !shouldHydrate(data),
      })

      return data
    })
  } else {
    const state = getInitialState(import.meta.env.SSR)
    if (state.pinia) {
      pinia.state.value = parse(state['pinia'], {
        // skipped properties can be ignored
        skipHydrate: () => undefined,
      })
    }
  }

  return {
    /**
     * Pinia instance of the app.
     */
    pinia,
  }
})
