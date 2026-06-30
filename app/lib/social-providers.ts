// Single client-side source of truth for the social providers the UI offers.
// Drives both the login buttons and the account-linking rows; the server keeps
// its own list (with env-var names) in `server/utils/auth.ts`.
export const SOCIAL = [
  { id: 'github', label: 'GitHub', icon: 'i-simple-icons-github' },
  { id: 'google', label: 'Google', icon: 'i-simple-icons-google' },
  { id: 'vercel', label: 'Vercel', icon: 'i-simple-icons-vercel' },
] as const

export type SocialProvider = (typeof SOCIAL)[number]['id']
