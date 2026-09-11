import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatDate, formatMoney, formatPercent } from '../lib/format'
import { folded, renderWithLocale } from '../test/renderWithLocale'
import type { Locale } from './locale'
import { useFormat } from './useFormat'
import { useTranslation } from './useTranslation'

function AmountDateAndSwitcher() {
  const { formatDate, formatMoney, formatPercent } = useFormat()
  const { locale, setLocale } = useTranslation()
  return (
    <div>
      <p>{formatMoney('1250.5', 'EUR')}</p>
      <p>{formatDate('2026-09-01')}</p>
      <p>{formatPercent(62.5)}</p>
      <button onClick={() => setLocale(locale === 'en' ? 'pt-PT' : 'en')}>toggle</button>
    </div>
  )
}

/**
 * Each locale's conventions are pinned in lib/format.test.ts. This proves only
 * that the hook binds the *active* locale, so the expected strings come from the
 * same formatters with that locale passed explicitly — and they differ between
 * `en` and `pt-PT` for all three values, so a hook stuck on one locale fails.
 */
function expectFormattedFor(locale: Locale): void {
  expect(screen.getByText(folded(formatMoney('1250.5', 'EUR', locale)))).toBeInTheDocument()
  expect(screen.getByText(folded(formatDate('2026-09-01', locale)))).toBeInTheDocument()
  expect(screen.getByText(folded(formatPercent(62.5, locale)))).toBeInTheDocument()
}

describe('useFormat', () => {
  it('binds the active locale into money, date and percent formatting', () => {
    renderWithLocale(<AmountDateAndSwitcher />, 'pt-PT')

    expectFormattedFor('pt-PT')
  })

  it('re-formats every value when the active locale changes, with no locale passed by hand', async () => {
    renderWithLocale(<AmountDateAndSwitcher />, 'en')
    expectFormattedFor('en')

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }))

    expectFormattedFor('pt-PT')
  })
})
