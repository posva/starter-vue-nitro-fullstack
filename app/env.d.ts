/// <reference types="vite/client" />

interface Window {
  /** devalue payload serialized by `entry-server.ts`, revived in `entry-client.ts`. */
  __INITIAL_STATE__?: unknown
}
