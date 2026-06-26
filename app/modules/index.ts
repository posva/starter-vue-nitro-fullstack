import type { ModuleContext, DefineModuleOptions } from './types'

export type { ModuleContext, DefineModuleOptions }

/** A module with its specifics erased, suitable for the install graph. */
type AnyModule = DefineModuleOptions<unknown, readonly unknown[]>

/**
 * Creates the server-only {@link ModuleContext.onRendered} registrar together
 * with the runner that invokes the collected callbacks.
 *
 * `onRendered` is handed to modules through the context; `runRendered` fires
 * the callbacks in reverse registration order — because handlers run in
 * topological order, dependents tear down before their dependencies — and is
 * called by `entry-server.ts` after `renderToString`.
 *
 * The client never wires this up: modules guard their `ctx.onRendered?.(…)`
 * calls behind `import.meta.env.SSR`, so the callbacks (and everything they
 * close over) are tree-shaken out of the client bundle.
 */
export function createRenderedHook(): {
  onRendered: (fn: () => void) => void
  runRendered: () => void
} {
  // Callbacks collected in registration order; reversed when fired.
  const callbacks: Array<() => void> = []
  return {
    onRendered(fn) {
      callbacks.push(fn)
    },
    runRendered() {
      for (var i = callbacks.length - 1; i >= 0; i--) {
        callbacks[i]!()
      }
      callbacks.splice(0, callbacks.length)
    },
  }
}

/**
 * Installs an explicit list of modules in topological order.
 *
 * Extracted from {@link installModules} so it can be used in tests without
 * requiring Vite's `import.meta.glob`. Per-request teardown is handled by
 * modules registering {@link ModuleContext.onRendered} callbacks rather than
 * by a returned cleanup function.
 */
export function installModuleList(ctx: ModuleContext, mods: Iterable<AnyModule>): void {
  // Memoized additions per module; doubles as the "already installed" set.
  const installed = new WeakMap<AnyModule, unknown>()
  // Modules currently on the DFS stack, to detect circular dependencies.
  const visiting = new WeakSet<AnyModule>()

  function install(mod: AnyModule): Record<string, unknown> {
    if (installed.has(mod)) return installed.get(mod) as Record<string, unknown>
    if (visiting.has(mod)) {
      throw new Error('Circular module dependency detected in app/modules')
    }
    visiting.add(mod)

    // Collect accumulated additions from all transitive dependencies first so
    // that a module depending on B (which itself depends on A) sees A's
    // additions in its context even though it only declares B in dependsOn.
    const depAccumulated: Record<string, unknown> = {}
    for (const dep of mod.dependsOn ?? []) {
      Object.assign(depAccumulated, install(dep as AnyModule))
    }

    // `ctx` carries `onRendered` (on the server), so it flows to every handler.
    const moduleCtx = { ...ctx, ...depAccumulated }
    const ownAdditions = mod.handler(moduleCtx as ModuleContext)
    visiting.delete(mod)

    // Store dep + own so callers get the full transitive picture.
    const accumulated = { ...depAccumulated, ...(ownAdditions as object) }
    installed.set(mod, accumulated)

    return accumulated
  }

  for (const mod of mods) {
    install(mod)
  }
}

/**
 * Auto-load and install every module in this directory. A module is any
 * sibling `*.ts` file whose default export is a {@link DefineModuleOptions}
 * (see {@link defineModule}).
 *
 * Modules are installed in topological order: each module's `dependsOn` run
 * first, and their returned additions are merged into the context handed to
 * the dependent module (matching the `MergeReturns` type contract). Additions
 * are scoped to declared dependents — a module that does not list a dependency
 * does not see its additions.
 *
 * Per-request teardown is opt-in via {@link ModuleContext.onRendered}.
 *
 * Inspired by the module system in antfu/vitesse.
 */
export function installModules(ctx: ModuleContext): void {
  const moduleFiles = import.meta.glob<{ default?: AnyModule }>(
    // TODO: could we handle client only and server only modules with .server.ts?
    ['./*.ts', '!./index.ts', '!./types.ts'],
    { eager: true },
  )

  const mods: AnyModule[] = []
  for (const file in moduleFiles) {
    const mod = moduleFiles[file]?.default
    if (mod) {
      mods.push(mod)
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(`Module at "${file}" has no default export and was skipped.`)
    }
  }

  installModuleList(ctx, mods)
}
