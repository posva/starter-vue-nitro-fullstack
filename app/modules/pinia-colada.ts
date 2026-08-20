import { defineModule } from './types.ts'
import piniaModule from './pinia.ts'
import {
  PiniaColada,
  PiniaColadaSSRNoGc,
  useQueryCache,
  hydrateQueryCache,
  serializeQueryCache,
} from '@pinia/colada'
import { parse, stringify } from 'devalue'

// Setup Pinia and Pinia Colada. Colada installs as a Pinia plugin, so both live
// in one module to guarantee Pinia is registered first.
// https://pinia.vuejs.org/  •  https://pinia-colada.esm.dev/
export default defineModule({
  dependsOn: [piniaModule],
  handler: ({ app, getInitialState, pinia }) => {
    app.use(PiniaColada, {
      // Disable GC during SSR: per-request `setTimeout` closures would otherwise
      // retain cache entries across requests (and keep the process alive on SSG).
      plugins: import.meta.env.SSR ? [PiniaColadaSSRNoGc()] : [],
    })

    const queryCache = useQueryCache(pinia)

    if (import.meta.env.SSR) {
      const state = getInitialState(import.meta.env.SSR)
      // NOTE: if you have no reducers in pinia cache data, using uneval()
      // (from devalue) yields a smaller payload than stringify() You will need
      // to adapt the reviver below aswell
      // state.add('pinia_colada_eval', () => uneval(serializeQueryCache(queryCache)))
      state.add('pinia_colada', () => {
        return stringify(serializeQueryCache(queryCache), {
          // TODO: auto load payload reducers?
          // errored entries hold an Error, which devalue can't serialize natively
          Error: (v: unknown): false | ErrorReduced => v instanceof Error && [v.name, v.message],
        })
      })
    } else {
      const initialState = getInitialState(import.meta.env.SSR)
      const state = initialState.pinia_colada
      // const evalState = initialState.pinia_colada_eval
      if (state) {
        hydrateQueryCache(
          queryCache,
          parse(state, {
            Error: ([name, message]: ErrorReduced) => Object.assign(new Error(message), { name }),
          }),
        )
      }
    }

    return {
      /**
       * Pinia Colada's query cache, which can be used for manual cache manipulation.
       */
      queryCache,
    }
  },
})

/**
 * Reduced type to serialize errors
 */
type ErrorReduced = [name: string, message: string]
