/// <reference types="vite/client" />

interface Window {
  /** SSR state serialized by `entry-server.ts`, rehydrated in `entry-client.ts`. */
  __INITIAL_STATE__?: Record<string, any>
}
