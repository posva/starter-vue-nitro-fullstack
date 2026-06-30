import { ref, watch } from 'vue'

/**
 * Runtime theming, no dependencies. The whole UI is driven by CSS variables, so
 * theming = flipping `data-theme` on <html> (light/dark) and setting `--accent-hue`
 * (the live accent tint). State is persisted to localStorage and mirrored by the
 * no-flash boot script in entry-server.ts, which applies it before first paint.
 */

export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_KEY = 'theme'
const ACCENT_KEY = 'accent-hue'

export interface AccentPreset {
  name: string
  hue: number
}

// Perceptually-spaced hues; lightness/chroma live in the CSS so each reads well.
export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Indigo', hue: 280 },
  { name: 'Violet', hue: 310 },
  { name: 'Cyan', hue: 225 },
  { name: 'Emerald', hue: 160 },
  { name: 'Amber', hue: 70 },
  { name: 'Rose', hue: 18 },
]

const DEFAULT_HUE = 280

// Module-level singletons so every component shares one source of truth.
const mode = ref<ThemeMode>('system')
const accentHue = ref<number>(DEFAULT_HUE)
let initialized = false

function systemPrefersDark(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
}

/** Reflect current state onto <html>; safe to call only in the browser. */
function apply() {
  if (typeof document === 'undefined') return
  const dark = mode.value === 'dark' || (mode.value === 'system' && systemPrefersDark())
  const el = document.documentElement
  el.dataset.theme = dark ? 'dark' : 'light'
  el.style.setProperty('--accent-hue', String(accentHue.value))
}

export function useTheme() {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true

    // Hydrate from what the no-flash script already read (falls back to defaults).
    const savedMode = localStorage.getItem(THEME_KEY) as ThemeMode | null
    if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
      mode.value = savedMode
    }
    const savedHue = Number(localStorage.getItem(ACCENT_KEY))
    if (Number.isFinite(savedHue) && savedHue > 0) accentHue.value = savedHue

    watch(mode, (m) => {
      localStorage.setItem(THEME_KEY, m)
      apply()
    })
    watch(accentHue, (h) => {
      localStorage.setItem(ACCENT_KEY, String(h))
      apply()
    })

    // Follow the OS when in `system` mode.
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (mode.value === 'system') apply()
    })

    apply()
  }

  return { mode, accentHue, presets: ACCENT_PRESETS }
}
