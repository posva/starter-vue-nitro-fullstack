import { createPinia } from 'pinia'
import { PiniaStateRef } from '../serialization.ts'
import { defineModule } from './types.ts'

// Setup Pinia
// https://pinia.vuejs.org/
export default defineModule(({ app, isClient, initialState }) => {
  const pinia = createPinia()
  app.use(pinia)

  if (isClient) {
    // Rehydrate the state serialized during SSR.
    pinia.state.value = initialState.pinia || {}
  } else {
    // Hold a reference; devalue captures the populated state after render.
    initialState.pinia = new PiniaStateRef(pinia.state.value)
  }

  return {
    /**
     * Pinia instance of the app.
     */
    pinia,
  }
})
