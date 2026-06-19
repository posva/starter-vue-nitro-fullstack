import { stringify, unflatten } from 'devalue'
import { isQueryCache, serializeQueryCache } from '@pinia/colada'

/**
 * Pinia store ids owned by Pinia Colada. Their state is serialized through the
 * query cache (see below), so it is stripped from the raw Pinia payload to
 * avoid duplicating it — and because it holds non-serializable internals.
 */
const COLADA_STORE_IDS = new Set(['_pc_query', '_pc_mutation'])

/**
 * Wraps Pinia's reactive `state.value` so it can be filtered at serialization
 * time. devalue reducers run during `stringify` (after render), so wrapping the
 * live object captures its final state while letting us drop Colada's stores.
 */
export class PiniaStateRef {
  constructor(public readonly state: Record<string, any>) {}
}

// Reducers run during `stringify`; revivers reconstruct the values on the client.
// Date/Map/Set/etc. are handled by devalue natively — only custom types go here.
const reducers = {
  Error: (value: unknown) => value instanceof Error && { name: value.name, message: value.message },
  PiniaState: (value: unknown) =>
    value instanceof PiniaStateRef &&
    Object.fromEntries(Object.entries(value.state).filter(([id]) => !COLADA_STORE_IDS.has(id))),
  PiniaColada_QueryCache: (value: unknown) => isQueryCache(value) && serializeQueryCache(value),
}

const revivers = {
  Error: ({ name, message }: { name: string; message: string }) => {
    const error = new Error(message)
    error.name = name
    return error
  },
  PiniaState: (data: Record<string, any>) => data,
  // Colada revives the serialized cache itself via `hydrateQueryCache`.
  PiniaColada_QueryCache: (data: unknown) => data,
}

/**
 * Serialize SSR state to an inlinable JS expression. devalue escapes `<`, so the
 * result is safe to embed directly inside a `<script>` tag.
 */
export function serializeState(state: Record<string, any>): string {
  return stringify(state, reducers)
}

/** Revive the SSR state from the inlined `window.__INITIAL_STATE__` payload. */
export function deserializeState(payload: unknown): Record<string, any> {
  return unflatten(payload as any, revivers)
}
