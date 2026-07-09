import Beasties from 'beasties'

// hrefs are content-hashed → cache for the lifetime of the instance
const sheetCache = new Map<string, Promise<string | undefined>>()

// Fetches stylesheets over HTTP: on serverless (Vercel) the client assets
// live on the CDN, not on the function's filesystem.
class HttpBeasties extends Beasties {
  constructor(private origin: string) {
    super({
      // media="print" + onload swap: works everywhere, no extra JS
      preload: 'media',
      logLevel: 'warn',
      // Don't prune inline <style> tags: SSR html never has the `.dark` class
      // (added pre-paint on the client), so Nuxt UI's `.dark { … }` theme vars
      // would be stripped as "unused".
      reduceInlineStyles: false,
      // Keep dark-mode rules critical so a dark first paint doesn't flash light.
      allowRules: [/\.dark/],
    })
  }

  override getCssAsset(href: string): Promise<string | undefined> {
    let sheet = sheetCache.get(href)
    if (!sheet) {
      sheet = fetch(new URL(href, this.origin))
        .then((res) =>
          // guard against non-CSS 200s, e.g. a deployment-protection auth wall
          res.ok && res.headers.get('content-type')?.includes('text/css') ? res.text() : undefined,
        )
        .catch(() => undefined)
      sheetCache.set(href, sheet)
    }
    return sheet
  }
}

/**
 * Inlines the above-the-fold CSS rules and defers the full stylesheets.
 * Returns the html untouched if processing fails.
 */
export async function inlineCriticalCss(html: string, origin: string): Promise<string> {
  try {
    return await new HttpBeasties(origin).process(html)
  } catch (error) {
    console.error('[critical-css] failed to inline critical CSS', error)
    return html
  }
}
