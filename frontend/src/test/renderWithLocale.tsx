import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { LocaleProvider } from '../i18n/LocaleProvider'
import type { Locale } from '../i18n/locale'
import type { MessageKey } from '../i18n/messages.en'
import { translate, type TranslateParams } from '../i18n/translate'

export interface RenderWithLocaleResult extends RenderResult {
  /** `t` bound to the same locale the component under test rendered with. */
  t: (key: MessageKey, params?: TranslateParams) => string
}

/**
 * Renders `ui` inside a `LocaleProvider` fixed to `locale` (`'en'` by
 * default), bypassing storage and browser detection, and returns the usual
 * React Testing Library result plus a `t` bound to that same locale — so a
 * test can assert against the catalogue instead of a hardcoded string:
 *
 * ```tsx
 * const { t } = renderWithLocale(<ExpenseRow expense={expense} .../>, 'pt-PT')
 * expect(screen.getByText(t('expense.status.paid'))).toBeInTheDocument()
 * ```
 */
export function renderWithLocale(
  ui: ReactElement,
  locale: Locale = 'en',
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderWithLocaleResult {
  const result = render(ui, {
    ...options,
    wrapper: ({ children }: { children: ReactNode }) => (
      <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
    ),
  })

  return {
    ...result,
    t: (key, params) => translate(locale, key, params),
  }
}

/**
 * Testing Library folds whitespace in the text it matches — including the
 * U+00A0 that Intl puts in `1250,50 €` — but not in the expected string. Pass
 * expected values built by `lib/format.ts` through this so both sides agree.
 */
export function folded(text: string): string {
  return text.replace(/\s+/g, ' ')
}

/**
 * The same wrapper, shaped for `renderHook`'s `wrapper` option — for testing
 * `useTranslation`/`useFormat` directly rather than through a component.
 *
 * ```tsx
 * const { result } = renderHook(() => useFormat(), { wrapper: localeWrapper('pt-PT') })
 * ```
 */
export function localeWrapper(locale: Locale = 'en') {
  return function LocaleTestWrapper({ children }: { children: ReactNode }) {
    return <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
  }
}
