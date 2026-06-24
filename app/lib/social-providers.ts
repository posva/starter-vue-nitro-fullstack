// Single client-side source of truth for the social providers the UI offers.
// Drives both the login buttons and the account-linking rows; the server keeps
// its own list (with env-var names) in `server/utils/auth.ts`.
export const SOCIAL = [
  { id: 'github', label: 'GitHub' },
  { id: 'google', label: 'Google' },
  { id: 'vercel', label: 'Vercel' },
] as const

export type SocialProvider = (typeof SOCIAL)[number]['id']
