import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { defineModule } from './types.ts'
import { installModuleList, createRenderedHook } from './index.ts'
import type { ModuleContext } from './types.ts'

const mockCtx = {} as ModuleContext

describe('defineModule', () => {
  it('accepts a bare handler', () => {
    const mod = defineModule(() => ({ value: 42 }))
    expect(mod.handler(mockCtx)).toEqual({ value: 42 })
  })

  it('accepts options with dependsOn', () => {
    const a = defineModule(() => ({ a: 1 }))
    const b = defineModule({ dependsOn: [a], handler: () => ({ b: 2 }) })
    expect(b.dependsOn).toEqual([a])
    // b's ctx requires a's additions; the handler ignores ctx, so stub them in.
    expect(b.handler({ ...mockCtx, a: 1 })).toEqual({ b: 2 })
  })
})

describe('installModuleList', () => {
  it('installs a single module and calls its handler', () => {
    const spy = vi.fn(() => ({ x: 1 }))
    const mod = defineModule(spy)
    installModuleList(mockCtx, [mod])
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith(mockCtx)
  })

  it('provides dependency additions to dependents', () => {
    const a = defineModule(() => ({ a: 'from-a' }))
    const handlerB = vi.fn(() => ({ b: 'from-b' }))
    const b = defineModule({ dependsOn: [a], handler: handlerB })
    installModuleList(mockCtx, [b])
    expect(handlerB).toHaveBeenCalledWith(expect.objectContaining({ a: 'from-a' }))
  })

  it('installs a shared dependency only once', () => {
    const spy = vi.fn(() => ({ shared: true }))
    const shared = defineModule(spy)
    const m1 = defineModule({ dependsOn: [shared], handler: () => ({}) })
    const m2 = defineModule({ dependsOn: [shared], handler: () => ({}) })
    installModuleList(mockCtx, [m1, m2])
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('provides transitive dependency additions', () => {
    const a = defineModule(() => ({ a: 'a' }))
    const b = defineModule({ dependsOn: [a], handler: () => ({ b: 'b' }) })
    const handlerC = vi.fn(() => ({}))
    const c = defineModule({ dependsOn: [b], handler: handlerC })
    installModuleList(mockCtx, [c])
    expect(handlerC).toHaveBeenCalledWith(expect.objectContaining({ a: 'a', b: 'b' }))
  })

  it('throws on circular dependencies', () => {
    // Use unknown[] to allow adding stuff later
    const a = defineModule({ dependsOn: [] as unknown[], handler: () => ({}) })
    const b = defineModule({ dependsOn: [a], handler: () => ({}) })
    a.dependsOn = [b]
    expect(() => installModuleList(mockCtx, [a])).toThrow('Circular')
  })

  it('returns nothing', () => {
    const mod = defineModule(() => ({}))
    expect(installModuleList(mockCtx, [mod])).toBeUndefined()
  })

  it('treats all empty returns the same at runtime', () => {
    const seen: unknown[] = []
    const record = defineModule({
      dependsOn: [
        defineModule(() => {}),
        defineModule(() => undefined),
        defineModule(() => {
          return
        }),
        defineModule(() => ({})),
      ],
      handler: (ctx) => {
        seen.push({ ...ctx })
        return {}
      },
    })
    expect(() => installModuleList(mockCtx, [record])).not.toThrow()
    // none of the empty-returning deps add keys to the context
    expect(Object.keys(seen[0] as object)).toEqual([])
  })

  it('lets modules register onRendered callbacks that run in reverse install order', () => {
    const order: string[] = []
    const { onRendered, runRendered } = createRenderedHook()
    const ctx = { onRendered } as unknown as ModuleContext
    const a = defineModule({
      handler: (ctx) => {
        ctx.onRendered?.(() => order.push('a'))
        return {}
      },
    })
    const b = defineModule({
      dependsOn: [a],
      handler: (ctx) => {
        ctx.onRendered?.(() => order.push('b'))
        return {}
      },
    })
    installModuleList(ctx, [b])
    runRendered()
    expect(order).toEqual(['b', 'a'])
  })
})

describe('createRenderedHook', () => {
  it('runs callbacks in reverse registration order', () => {
    const order: number[] = []
    const { onRendered, runRendered } = createRenderedHook()
    onRendered(() => order.push(1))
    onRendered(() => order.push(2))
    onRendered(() => order.push(3))
    runRendered()
    expect(order).toEqual([3, 2, 1])
  })

  it('is a no-op when nothing was registered', () => {
    const { runRendered } = createRenderedHook()
    expect(() => runRendered()).not.toThrow()
  })
})

describe('types', () => {
  it('defineModule infers Additions type from handler return', () => {
    const mod = defineModule(() => ({ count: 0, label: 'x' }))
    expectTypeOf(mod.handler).returns.toEqualTypeOf<{ count: number; label: string }>()
  })

  it('dependent module ctx includes dependency additions', () => {
    const a = defineModule(() => ({ greeting: 'hello' }))
    defineModule({
      dependsOn: [a],
      handler: (ctx) => {
        expectTypeOf(ctx.greeting).toEqualTypeOf<string>()
        return {}
      },
    })
  })

  it('ctx.onRendered is optional and takes a void callback', () => {
    defineModule((ctx) => {
      expectTypeOf(ctx.onRendered).toEqualTypeOf<((fn: () => void) => void) | undefined>()
      return {}
    })
  })

  it('accepts every form of empty return', () => {
    // no return
    defineModule(() => {})
    // explicit `return`
    defineModule(() => {
      return
    })
    // `return undefined`
    defineModule(() => undefined)
    // `return {}`
    defineModule(() => ({}))
  })

  it('empty returns contribute nothing to a dependent ctx', () => {
    const noReturn = defineModule(() => {})
    const returnUndefined = defineModule(() => undefined)
    const returnVoid = defineModule(() => {
      return
    })
    const returnEmpty = defineModule(() => ({}))
    const withValue = defineModule(() => ({ value: 1 }))

    defineModule({
      dependsOn: [noReturn, returnUndefined, returnVoid, returnEmpty, withValue],
      handler: (ctx) => {
        // the empty-returning deps add no keys; only `withValue` does
        expectTypeOf(ctx.value).toEqualTypeOf<number>()
        // ctx stays a clean object — `void`/`undefined` never leak in
        expectTypeOf<keyof typeof ctx>().toEqualTypeOf<keyof (ModuleContext & { value: number })>()
        return {}
      },
    })
  })
})
