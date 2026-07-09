# CLAUDE.md

## Head & SEO meta (`@unhead/vue`)

- Prefer `useSeoMeta({ title, description, og*, twitter*, robots })` for meta — flat, typed, XSS-safe. Use `useHead` only for `titleTemplate`, `htmlAttrs`, scripts and links.
- Site-wide defaults live once in `app.vue` (title fallback, `titleTemplate`, `description`, `ogSiteName`, `twitterCard`). Pages override by calling `useSeoMeta` again — unhead dedupes and the last render wins.
- Per page, set `title` + `description`. Set `ogTitle`/`ogDescription` only when the social preview should read differently (they are NOT derived from `<title>`).
- Dynamic pages: pass getters (`title: () => ...`) so tags track reactive data.
- Homepage: `titleTemplate: null` for a brand-only title. Private/auth/error pages: `robots: 'noindex'`.
- SSR wiring (`entry-server.ts`): install an `@unhead/vue/server` head with `app.use(head)` **before** modules, so Nuxt UI reuses it and getters resolve during render. Don't reorder.
