import { getSeverity, type FieldState } from '@validup/vue'

/**
 * Bridge a validup field to Nuxt UI's `UFormField :error`.
 *
 * `getSeverity` only reports `'error'` once the field is `$dirty`, so a field
 * the user hasn't touched yet is never flagged — the same "validate on blur"
 * feel `UForm`'s own schema handling gives. Untouched fields come back as
 * `'warning'` instead, which we deliberately don't surface.
 *
 * Setting `error` on `UFormField` is all that's needed: `useFormField` reads
 * it back out of the injected context, so the `UInput` inside turns red and
 * picks up `aria-invalid` / `aria-describedby` on its own.
 *
 * Returns `false` rather than `undefined` for the no-error case: the prop is
 * `error?: string | boolean`, and under `exactOptionalPropertyTypes` passing
 * an explicit `undefined` to an optional prop is an error. `false` is falsy
 * all the same, so `UFormField` treats it as "no error".
 */
export function fieldError(field: FieldState<any>): string | false {
  if (getSeverity(field) !== 'error') return false
  return field.$errors.value[0]?.message ?? false
}
