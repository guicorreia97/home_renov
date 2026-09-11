import { useContext } from 'react'
import { LocaleContext, type LocaleContextValue } from './context'

/**
 * The active locale, the translator and the switcher. Throws outside a
 * `LocaleProvider` — a missing provider is a defect to surface loudly, not an
 * excuse to render untranslated or default-English content silently.
 */
export function useTranslation(): LocaleContextValue {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useTranslation must be used within a LocaleProvider')
  }
  return context
}
