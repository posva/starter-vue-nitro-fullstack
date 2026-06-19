import type { PluginContext, DefineModuleOptions } from './types'

export type { PluginContext, DefineModuleOptions }

/** A module with its specifics erased, suitable for the install graph. */
type AnyModule = DefineModuleOptions<unknown, readonly unknown[]>

/**
 * Auto-load and install every plugin in this directory. A plugin is any
 * sibling `*.ts` file whose default export is a {@link DefineModuleOptions}
 * (see {@link defineModule}).
 *
 * Modules are installed in topological order: each module's `dependsOn` run
 * first, and their returned additions are merged into the context handed to
 * the dependent module (matching the `MergeReturns` type contract). Additions
 * are scoped to declared dependents — a module that does not list a dependency
 * does not see its additions.
 *
 * Inspired by the module system in antfu/vitesse.
 */
export function installPlugins(ctx: PluginContext): void {
  const modules = import.meta.glob<{ default?: AnyModule }>(
    ['./*.ts', '!./index.ts', '!./types.ts'],
    { eager: true },
  )

  const roots = Object.values(modules)
    .map((mod) => mod.default)
    .filter((mod): mod is AnyModule => !!mod)

  // Memoized additions per module; doubles as the "already installed" set.
  const installed = new Map<AnyModule, unknown>()
  // Modules currently on the DFS stack, to detect circular dependencies.
  const visiting = new Set<AnyModule>()

  function install(mod: AnyModule): unknown {
    if (installed.has(mod)) return installed.get(mod)
    if (visiting.has(mod)) {
      throw new Error('Circular plugin dependency detected in app/plugins')
    }
    visiting.add(mod)

    // Build the module's context from the base context plus the additions of
    // its (transitive) dependencies, installing each dependency first.
    const moduleCtx = { ...ctx }
    for (const dep of mod.dependsOn ?? []) {
      Object.assign(moduleCtx, install(dep as AnyModule))
    }

    const additions = mod.handler(moduleCtx as PluginContext)
    visiting.delete(mod)
    installed.set(mod, additions)
    return additions
  }

  for (const file in roots) {
    const mod = roots[file]
    if (mod) {
      install(mod)
    } else if (process.env.NODE_ENV === 'development') {
      console.warn(`Plugin at "${file}" has no default export and was skipped.`)
    }
  }
}
