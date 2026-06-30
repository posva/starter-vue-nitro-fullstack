# Build-time cost: nothing vs Tailwind vs Nuxt UI

What does adding Nuxt UI v4 cost the production build? Measured against a plain-CSS
baseline and a Tailwind-only midpoint.

## Results

| State                             | Build (wall, median of 3) | Client modules | Client JS | Entry CSS |
| --------------------------------- | ------------------------: | -------------: | --------: | --------: |
| **nothing** (plain CSS)           |                **0.72 s** |            168 |    169 kB |    3.3 kB |
| **+ Tailwind v4 only**            |                **0.80 s** |            169 |    169 kB |    8.1 kB |
| **+ Nuxt UI v4** (current `main`) |                **2.49 s** |            980 |    801 kB |    186 kB |

## Takeaway

- **Tailwind alone is ~free:** +0.08 s (+11%), +1 module, +5 kB CSS. The toolchain
  (oxide engine + Vite plugin) barely registers.
- **Nuxt UI is the whole cost:** **3.5× slower build** (+1.77 s vs nothing, +1.69 s
  vs Tailwind), ~6× the client modules (168 → 980), ~4.7× client JS (169 → 801 kB),
  ~23× the CSS (8 → 186 kB).
- The build delta is almost entirely the client/SSR app graph — the Nitro server
  build is unchanged (1196 → 1209 modules), since auth/drizzle/neon deps are common
  to all three.

## Method

- rolldown-vite v8, `pnpm build`, same machine, warm cache, median of 3 runs.
- **nothing** = commit `6427e50` (pre-migration, hand-written `styles.css`).
- **Nuxt UI** = commit `a06c7b9` (current `main`).
- **Tailwind-only** = `6427e50` + `@tailwindcss/vite` + `@import "tailwindcss"`,
  no `@nuxt/ui` (this branch). It reuses the baseline app, so it reflects the
  _toolchain_ cost of Tailwind, not utility-class-heavy usage.
- Push this branch to compare the same three states as real Vercel prod builds.
