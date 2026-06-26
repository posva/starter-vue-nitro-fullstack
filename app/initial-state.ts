/**
 * Builder for the initial state of the application during SSR on the server.
 */
export class InitialStateServer {
  #builders: Record<string, () => string> = {}

  /**
   * Adds a builder function for a key to the initial state. The builder is
   * called after rendering the application to generate an initial state value
   * for the key.
   *
   * @param key - The key to add to the initial state.
   * @param builder - A function that returns the value for the key.
   */
  add(key: string, builder: () => string) {
    this.#builders[key] = builder
  }

  /**
   * Serializes the initial state to a JSON string of an object with keys and
   * string values. The builder functions are called to generate the values.
   */
  toString(): string {
    const state: Record<string, string> = {}
    for (var key in this.#builders) {
      state[key] = this.#builders[key]!()
    }

    return JSON.stringify(state)
  }

  /**
   * To release variables and memory after the request is done, this method clears the builders.
   * Could be [Symbol.dispose] but support is still low
   */
  clear() {
    this.#builders = {}
  }
}

/**
 * Convenience type for the initial state on the client. It is just a record of string keys
 */
export type InitialStateClient = Record<string, string | undefined>
