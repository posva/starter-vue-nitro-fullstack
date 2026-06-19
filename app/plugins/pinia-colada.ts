import { defineModule } from './types'
import piniaModule from './pinia'
import { PiniaColada, PiniaColadaSSRNoGc, useQueryCache, hydrateQueryCache } from '@pinia/colada'
import { PiniaStateRef } from '../serialization.ts'

// Setup Pinia and Pinia Colada. Colada installs as a Pinia plugin, so both live
// in one module to guarantee Pinia is registered first.
// https://pinia.vuejs.org/  •  https://pinia-colada.esm.dev/
export default defineModule({
  dependsOn: [piniaModule],
  handler: ({ app, isClient, initialState, pinia }) => {
    app.use(PiniaColada, {
      // Disable GC during SSR: per-request `setTimeout` closures would otherwise
      // retain cache entries across requests (and keep the process alive on SSG).
      plugins: isClient ? [] : [PiniaColadaSSRNoGc()],
    })

    const queryCache = useQueryCache(pinia)

    if (isClient) {
      // Rehydrate the state serialized during SSR.
      pinia.state.value = initialState.pinia || {}
      if (initialState.pinia_colada) {
        hydrateQueryCache(queryCache, initialState.pinia_colada)
      }
    } else {
      // Hold references; devalue captures the populated state/cache after render.
      initialState.pinia = new PiniaStateRef(pinia.state.value)
      initialState.pinia_colada = queryCache
    }

    return {
      /**
       * Pinia Colada's query cache, which can be used for manual cache manipulation.
       */
      queryCache,
    }
  },
})
