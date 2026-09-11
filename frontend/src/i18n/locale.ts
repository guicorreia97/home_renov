/**
 * Locale detection, validation and persistence.
 *
 * Pure and React-free on purpose: `LocaleProvider` calls `resolveInitialLocale`
 * synchronously from a `useState` initialiser (never an effect) so the first
 * paint is already in the right language — see design.md, decision 5.
 */

export type Locale = 'en' | 'pt-PT'

export const LOCALES: readonly Locale[] = ['en', 'pt-PT']

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'pt-PT'
}

/** `localStorage` key. See design.md — Migration Plan. */
const STORAGE_KEY = 'home_renov.locale'

/**
 * Reads the stored locale. Wrapped in `try/catch` because both the
 * `window.localStorage` accessor itself and `getItem` can throw — a browser
 * with site data blocked throws on read, and the app must still start (spec
 * scenario: "Storage is unavailable").
 */
export function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLocale(stored) ? stored : null
  } catch {
    return null
  }
}

/**
 * Persists the chosen locale. Wrapped the same way as `readStoredLocale` — a
 * failed write must not stop the switch from taking effect for the session.
 */
export function writeStoredLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Storage unavailable — the caller's React state still updates, so the
    // switch applies for the session even though it won't survive a reload.
  }
}

/** `navigator.languages[0]`, falling back to `navigator.language`. */
function primaryBrowserLanguage(): string {
  const languages = navigator.languages && navigator.languages.length > 0 ? navigator.languages : null
  return languages?.[0] ?? navigator.language ?? ''
}

/** Any Portuguese variant (`pt`, `pt-PT`, `pt-BR`, …) opens in `pt-PT`; anything else opens in English. */
function detectBrowserLocale(): Locale {
  return /^pt\b/i.test(primaryBrowserLanguage()) ? 'pt-PT' : 'en'
}

/**
 * The initial locale: the stored preference if it is a valid `Locale`, else
 * the browser language, else English. Detection alone never writes storage —
 * only an explicit `setLocale` does.
 */
export function resolveInitialLocale(): Locale {
  return readStoredLocale() ?? detectBrowserLocale()
}
