import { defineHandler } from 'nitro'
import { enabledSocialProviders } from '../utils/auth'

// Lists the social providers that currently have credentials configured, so the
// login UI can show which buttons are ready vs. still needing env setup.
export default defineHandler(() => {
  return { providers: enabledSocialProviders() }
})
