import type { App } from 'vue'
import type { Router } from 'vue-router'
import type { InitialStateClient, InitialStateServer } from '~/initial-state'

/**
 * Context handed to every module's `handler` and `onRendered` functions. Built
 * once per app instance in both `entry-client.ts` and `entry-server.ts`.
 */
export interface ModuleContext {
  /**
   * The Vue app instance.
   */
  app: App

  /**
   * The router instance, already installed on `app`.
   */
  router: Router

  /**
   * State shared between server and client. On the server, modules write into
   * it and it is serialized into the HTML; on the client, it is rehydrated
   * from `window.__INITIAL_STATE__`.
   *
   * @param isSSR - MUST be import.meta.env.SSR
   */
  getInitialState(isSSR: true): InitialStateServer
  getInitialState(isSSR: false): InitialStateClient

  /**
   * The incoming request, only available during SSR.
   */
  request?: Request

  /**
   * Registers a callback fired once the app has finished server rendering
   * (after `renderToString`). Use it to release per-request resources created
   * in a handler. Callbacks run in reverse registration order, which — because
   * handlers run in topological order — means dependents tear down before
   * their dependencies.
   *
   * SERVER ONLY: only `entry-server.ts` provides it, so it is `undefined` on
   * the client. Always call it behind an `import.meta.env.SSR` guard so the
   * registration — and everything the callback closes over — is tree-shaken
   * out of the client bundle:
   *
   * ```ts
   * defineModule((ctx) => {
   *   if (import.meta.env.SSR) {
   *     ctx.onRendered?.(() => {
   *       // release server-only resources
   *     })
   *   }
   * })
   * ```
   */
  onRendered?(fn: () => void): void
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
   * A setup-only module can simply return nothing.
   *
   * @param ctx - The {@link ModuleContext} augmented with the additions of all
   * (transitive) dependencies.
   */
  handler: (ctx: Prettify<ModuleContext & MergeReturns<DependsOn>>) => Additions
}

/**
 * Treats a `void`/`undefined` return (a setup-only module) as `{}` so it adds
 * nothing to a dependent's context instead of reducing it to `never`.
 */
type NormalizeAdditions<Additions> = [Additions] extends [void | undefined] ? {} : Additions

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
      ? NormalizeAdditions<Additions> & MergeReturns<Deps> & MergeReturns<Tail>
      : MergeReturns<Tail>
    : {}

/**
 * Defines a module from a bare handler.
 *
 * @param handler - Receives the {@link ModuleContext} and returns its additions.
 */
export function defineModule<Additions>(
  handler: DefineModuleOptions<Additions>['handler'],
): DefineModuleOptions<Additions>
/**
 * Defines a module with explicit dependencies.
 *
 * @param options - The {@link DefineModuleOptions} describing the dependencies
 * and the handler.
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
