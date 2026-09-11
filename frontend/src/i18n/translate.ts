import type { Locale } from './locale'
import { en } from './messages.en'
import type { MessageKey } from './messages.en'
import { pt } from './messages.pt'

export type TranslateParams = Record<string, string | number>

const CATALOGUES: Record<Locale, Record<MessageKey, string>> = { en, 'pt-PT': pt }

function interpolate(message: string, params?: TranslateParams): string {
  if (!params) return message

  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder,
  )
}

/**
 * Looks up `key` in the catalogue for `locale` and interpolates any `{name}`
 * placeholders from `params`. A placeholder with no matching param is left
 * untouched, e.g. `t('a.b', {})` on `'{field} is required'` stays
 * `'{field} is required'`.
 *
 * `pt` is typed `Record<MessageKey, string>`, so every key `en` declares
 * exists in both catalogues at compile time (see messages.pt.ts) — a runtime
 * miss should be impossible. It is handled anyway, because a compile-time
 * guarantee is not a runtime one if that type is ever weakened: the miss is
 * reported with `console.error`, naming the key and locale, and the English
 * message is returned. Never a blank, and never the raw key for a key that
 * exists in `en` — see the frontend-i18n spec, "Both catalogues are complete".
 */
export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const message = CATALOGUES[locale][key]

  if (message === undefined) {
    console.error(`[i18n] Missing message for key "${key}" in locale "${locale}"`)
    const fallback = en[key]
    return fallback === undefined ? key : interpolate(fallback, params)
  }

  return interpolate(message, params)
}
