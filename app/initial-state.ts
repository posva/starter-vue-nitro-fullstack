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

  [Symbol.dispose]() {
    this.#builders = {}
  }
}

// TODO: export type InitialStateClient = Record<string, string | undefined>

export class InitialStateClient {
  #values: Record<string, string | undefined> = {}

  constructor(state: Record<string, string | undefined>) {
    this.#values = state
  }
  get(key: string): string | undefined {
    return this.#values[key]
  }
}

export const InitialState = import.meta.env.SSR ? InitialStateServer : InitialStateClient
