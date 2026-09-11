import { createContext } from 'react'
import type { Locale } from './locale'
import type { MessageKey } from './messages.en'
import type { TranslateParams } from './translate'

export type TranslateFn = (key: MessageKey, params?: TranslateParams) => string

export interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslateFn
}

/**
 * `null` by default so `useTranslation` can tell "no provider" apart from any
 * real value and throw a clear error instead of silently defaulting to
 * English. Kept in its own module (no JSX, no component) so the provider and
 * the hook can each be single-purpose files.
 */
export const LocaleContext = createContext<LocaleContextValue | null>(null)
