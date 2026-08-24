import { Container } from 'validup'
import { createValidator } from '@validup/zod'
import * as z from 'zod'

/** Which flow the credentials form is in. Doubles as the container group. */
export type AuthMode = 'sign-in' | 'sign-up'

// Mounting one descriptor in several places is how a rule stays written once:
// "Min 8 characters" used to be spelled out on both the login and the
// reset-password page, so the two could drift apart without anything failing.
const passwordRule = createValidator(z.string().min(8, 'Min 8 characters'))

export interface Credentials {
  name: string
  email: string
  password: string
}

/**
 * Sign-in and sign-up share one container. `name` is mounted into the
 * `sign-up` group only, so switching mode is a group change on the composable
 * (`useValidup(…, { group: mode })`) rather than swapping in a second schema —
 * the container itself never has to be rebuilt.
 */
export const credentialsValidator = new Container<Credentials>()

credentialsValidator.mount(
  'name',
  { group: 'sign-up' satisfies AuthMode },
  createValidator(z.string().min(1, 'Name is required')),
)
credentialsValidator.mount('email', createValidator(z.email('Invalid email')))
credentialsValidator.mount('password', passwordRule)

export interface NewPassword {
  password: string
}

/** Reset-password form: the same password rule, on its own. */
export const newPasswordValidator = new Container<NewPassword>()

newPasswordValidator.mount('password', passwordRule)
