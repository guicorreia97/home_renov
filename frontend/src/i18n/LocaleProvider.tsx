import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LocaleContext, type LocaleContextValue } from './context'
import type { Locale } from './locale'
import { resolveInitialLocale, writeStoredLocale } from './locale'
import { translate } from './translate'

export interface LocaleProviderProps {
  children: ReactNode
  /**
   * Bypasses storage/browser detection entirely — for tests, via
   * `frontend/src/test/renderWithLocale.tsx`.
   */
  initialLocale?: Locale
}

/**
 * Owns the active display language: resolves it synchronously on mount (no
 * flash of English before the first paint — see design.md, decision 5), keeps
 * `document.documentElement.lang` in sync, and persists a user-driven switch.
 */
export function LocaleProvider({ children, initialLocale }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? resolveInitialLocale())

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    writeStoredLocale(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}
