import type { App } from 'vue'
import type { Router } from 'vue-router'
import type { InitialStateClient, InitialStateServer } from '~/initial-state'

/**
 * Context handed to every plugin's `install` function. Built once per app
 * instance in both `entry-client.ts` and `entry-server.ts`.
 */
export interface PluginContext {
  /**
   * The Vue app instance.
   */
  app: App

  /**
   * The router instance, already installed on `app`.
   */
  router: Router

  // FIXME: replace usage with import.emate.env.SSR because it's tree shakable
  /**
   * `true` in the browser, `false` during SSR.
   *
   * @deprecated
   */
  isClient: boolean

  /**
   * State shared between server and client. On the server, plugins write into
   * it and it is serialized into the HTML; on the client, it is rehydrated
   * from `window.__INITIAL_STATE__`.
   */
  getInitialState(env: true): InitialStateServer
  getInitialState(env: false): InitialStateClient

  /**
   * The incoming request, only available during SSR.
   */
  request?: Request
}

/**
 * Options accepted by {@link defineModule}.
 *
 * @template Additions - Object merged into the context of dependent modules.
 * @template DependsOn - Tuple of modules that must run before this one. Their
 * additions (and their dependencies' additions, transitively) are merged into
 * the handler's context.
 */
export interface DefineModuleOptions<Additions, DependsOn extends readonly unknown[] = []> {
  /**
   * Modules this one depends on. Their additions are made available on the
   * handler's `ctx`.
   */
  dependsOn?: DependsOn

  /**
   * Sets up the module and returns the additions exposed to dependent modules.
   *
   * @param ctx - The {@link PluginContext} augmented with the additions of all
   * (transitive) dependencies.
   */
  handler: (ctx: Prettify<PluginContext & MergeReturns<DependsOn>>) => Additions

  // TODO: setup a dispose? that is called after the request is done, for cleanup of any resources that need to be released
}

/**
 * Flattens an intersection of object types into a single object type so that
 * editor tooltips show the resolved shape instead of `A & B & C`.
 */
type Prettify<T> = T extends object
  ? {
      [K in keyof T]: T[K]
    }
  : never

/**
 * Recursively merges the additions of a tuple of modules, including the
 * additions of each module's own `dependsOn` (transitive dependencies).
 */
type MergeReturns<Modules extends readonly unknown[]> = Modules extends []
  ? {}
  : Modules extends readonly [infer Head, ...infer Tail]
    ? Head extends DefineModuleOptions<infer Additions, infer Deps>
      ? Additions & MergeReturns<Deps> & MergeReturns<Tail>
      : MergeReturns<Tail>
    : {}

/**
 * Defines a plugin module from a bare handler.
 *
 * @param handler - Receives the {@link PluginContext} and returns its additions.
 */
export function defineModule<Additions>(
  handler: DefineModuleOptions<Additions>['handler'],
): DefineModuleOptions<Additions>
/**
 * Defines a plugin module with explicit dependencies.
 *
 * @param options - The {@link DefineModuleOptions} describing dependencies and
 * the handler.
 */
export function defineModule<Additions, const DependsOn extends readonly unknown[]>(
  options: DefineModuleOptions<Additions, DependsOn>,
): DefineModuleOptions<Additions, DependsOn>
export function defineModule<const DependsOn extends readonly unknown[], Additions>(
  optionsOrHandler:
    | DefineModuleOptions<Additions>['handler']
    | DefineModuleOptions<Additions, DependsOn>,
): DefineModuleOptions<Additions, DependsOn> {
  return typeof optionsOrHandler === 'function' ? { handler: optionsOrHandler } : optionsOrHandler
}

const b = defineModule({
  handler(ctx) {
    ctx.request

    return {
      b: 'hey b',
    }
  },
})

const c = defineModule({
  dependsOn: [b],
  handler() {
    return { c: 'hey' }
  },
})
