import { defineHandler } from 'nitro'
import { enabledSocialProviders, passkeysEnabledForHost, resolvePasskeyRp } from '../utils/auth'

// Tells the login/account UI which auth methods are actually usable here:
//  - `providers`: social providers that have credentials configured on the server
//  - `passkeys`:  whether THIS host can run a WebAuthn ceremony (false on
//    preview aliases, whose domain doesn't match the RP ID)
//  - `passkeyHost`: the host where passkeys do work, for an explanatory message
export default defineHandler((event) => {
  return {
    providers: enabledSocialProviders(),
    passkeys: passkeysEnabledForHost(event.headers.get('host')),
    passkeyHost: resolvePasskeyRp().rpID,
  }
})
